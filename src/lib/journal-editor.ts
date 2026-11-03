import type {
  JournalElement,
  JournalEntry,
  PaperTemplate,
  PageMargin,
} from "./journal-data";
import { journalEntries } from "./journal-data";

export type PageSide = "left" | "right";

export interface Selection {
  side: PageSide;
  id: string;
}

export interface EditorState {
  entries: JournalEntry[];
  activeId: string;
  /** 当前看到的是这本书的第几张跨页（从 0 开始） */
  activeSpread: number;
  /** 当前正在编辑哪一页，新素材会放到这一页 */
  activeSide: PageSide;
  selected: Selection | null;
  /** 撤销栈：每次结构性修改前压入一份快照 */
  past: JournalEntry[][];
}

export type EditorAction =
  | { type: "select"; side: PageSide; id: string | null }
  | { type: "switchEntry"; id: string }
  | { type: "addEntry" }
  | { type: "beginDrag" }
  | { type: "move"; side: PageSide; id: string; x: number; y: number }
  /** 拖动时可能跨到另一页：from 是元素当前所在的页，to 是拖动后落到哪一页 */
  | {
      type: "moveTo";
      from: PageSide;
      to: PageSide;
      id: string;
      x: number;
      y: number;
    }
  /** 只切换“新素材放到哪一页”，不影响当前选中 */
  | { type: "setSide"; side: PageSide }
  | {
      type: "resize";
      side: PageSide;
      id: string;
      w: number;
      size?: number;
    }
  | {
      type: "update";
      side: PageSide;
      id: string;
      patch: Partial<JournalElement>;
      transient?: boolean;
    }
  | { type: "add"; side: PageSide; element: JournalElement }
  | { type: "remove"; side: PageSide; id: string }
  | { type: "renameEntry"; id: string; title: string }
  | { type: "deleteEntry"; id: string }
  | { type: "setPaperTemplate"; id: string; paperTemplate: PaperTemplate }
  | { type: "setPageMargin"; id: string; pageMargin: PageMargin }
  | { type: "undo" }
  /** 翻页（由页面在翻页动画结束后调用） */
  | { type: "goSpread"; index: number }
  /** 在当前跨页后面加一张空白跨页 */
  | { type: "addSpread" }
  /** 删掉当前跨页（只有两面都空、且书里不止一张跨页时才允许） */
  | { type: "removeSpread" }
  /** 从本地存档恢复 */
  | {
      type: "hydrate";
      entries: JournalEntry[];
      activeId: string;
      activeSpread?: number;
    };

const MAX_HISTORY = 30;

export const initialEditorState: EditorState = {
  entries: journalEntries,
  activeId: journalEntries[0].id,
  activeSpread: 0,
  activeSide: "left",
  selected: null,
  past: [],
};

function pushHistory(past: JournalEntry[][], entries: JournalEntry[]) {
  return [...past, entries].slice(-MAX_HISTORY);
}

function clampSpread(index: number, entry: JournalEntry) {
  return Math.min(Math.max(0, index), entry.spreads.length - 1);
}

/** 修改某一本手账的第 index 张跨页的某一面 */
function patchPage(
  entries: JournalEntry[],
  entryId: string,
  spreadIndex: number,
  side: PageSide,
  fn: (list: JournalElement[]) => JournalElement[],
): JournalEntry[] {
  return entries.map((entry) => {
    if (entry.id !== entryId) return entry;
    return {
      ...entry,
      spreads: entry.spreads.map((spread, index) => {
        if (index !== spreadIndex) return spread;
        return side === "left"
          ? { ...spread, left: fn(spread.left) }
          : { ...spread, right: fn(spread.right) };
      }),
    };
  });
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  const activeEntry =
    state.entries.find((entry) => entry.id === state.activeId) ?? state.entries[0];
  const spreadIndex = clampSpread(state.activeSpread, activeEntry);
  const activeSpread = activeEntry.spreads[spreadIndex];

  switch (action.type) {
    case "select":
      return {
        ...state,
        activeSide: action.side,
        selected: action.id ? { side: action.side, id: action.id } : null,
      };

    case "switchEntry":
      return {
        ...state,
        activeId: action.id,
        activeSpread: 0,
        activeSide: "left",
        selected: null,
      };

    case "setSide":
      return { ...state, activeSide: action.side };

    case "addEntry": {
      const id = `entry-${Date.now().toString(36)}`;
      const entry: JournalEntry = {
        id,
        title: `新的手账 ${state.entries.length}`,
        cover: "",
        spreads: [{ id: `${id}-s1`, left: [], right: [] }],
        paperTemplate: "watercolor",
        pageMargin: "normal",
      };
      return {
        ...state,
        entries: [...state.entries, entry],
        activeId: id,
        activeSpread: 0,
        activeSide: "left",
        selected: null,
        past: pushHistory(state.past, state.entries),
      };
    }

    case "beginDrag":
      return { ...state, past: pushHistory(state.past, state.entries) };

    case "move":
      return {
        ...state,
        entries: patchPage(
          state.entries,
          state.activeId,
          spreadIndex,
          action.side,
          (list) =>
            list.map((el) =>
              el.id === action.id ? { ...el, x: action.x, y: action.y } : el,
            ),
        ),
      };

    case "moveTo": {
      // 同一页内挪动，直接改坐标
      if (action.from === action.to) {
        return {
          ...state,
          entries: patchPage(
            state.entries,
            state.activeId,
            spreadIndex,
            action.to,
            (list) =>
              list.map((el) =>
                el.id === action.id ? { ...el, x: action.x, y: action.y } : el,
              ),
          ),
        };
      }

      // 跨页：从当前页摘下来，再追加到目标页末尾
      return {
        ...state,
        entries: state.entries.map((entry) => {
          if (entry.id !== state.activeId) return entry;
          const spread = entry.spreads[spreadIndex];
          const fromList = action.from === "left" ? spread.left : spread.right;
          const moving = fromList.find((el) => el.id === action.id);

          // 元素已经不在 from 页了（连续事件里重复触发），只更新坐标
          if (!moving) {
            return {
              ...entry,
              spreads: entry.spreads.map((item, index) =>
                index !== spreadIndex
                  ? item
                  : {
                      ...item,
                      left:
                        action.to === "left"
                          ? item.left.map((el) =>
                              el.id === action.id
                                ? { ...el, x: action.x, y: action.y }
                                : el,
                            )
                          : item.left,
                      right:
                        action.to === "right"
                          ? item.right.map((el) =>
                              el.id === action.id
                                ? { ...el, x: action.x, y: action.y }
                                : el,
                            )
                          : item.right,
                    },
              ),
            };
          }

          const moved = { ...moving, x: action.x, y: action.y };
          const keptLeft =
            action.from === "left"
              ? spread.left.filter((el) => el.id !== action.id)
              : spread.left;
          const keptRight =
            action.from === "right"
              ? spread.right.filter((el) => el.id !== action.id)
              : spread.right;

          return {
            ...entry,
            spreads: entry.spreads.map((item, index) =>
              index !== spreadIndex
                ? item
                : {
                    ...item,
                    left: action.to === "left" ? [...keptLeft, moved] : keptLeft,
                    right:
                      action.to === "right" ? [...keptRight, moved] : keptRight,
                  },
            ),
          };
        }),
        activeSide: action.to,
        selected: { side: action.to, id: action.id },
      };
    }

    case "resize":
      return {
        ...state,
        entries: patchPage(
          state.entries,
          state.activeId,
          spreadIndex,
          action.side,
          (list) =>
            list.map((el) =>
              el.id === action.id
                ? {
                    ...el,
                    w: action.w,
                    size: action.size ?? el.size,
                  }
                : el,
            ),
        ),
      };

    case "update":
      return {
        ...state,
        entries: patchPage(
          state.entries,
          state.activeId,
          spreadIndex,
          action.side,
          (list) =>
            list.map((el) => (el.id === action.id ? { ...el, ...action.patch } : el)),
        ),
        past: action.transient
          ? state.past
          : pushHistory(state.past, state.entries),
      };

    case "add":
      return {
        ...state,
        entries: patchPage(
          state.entries,
          state.activeId,
          spreadIndex,
          action.side,
          (list) => [...list, action.element],
        ),
        activeSide: action.side,
        selected: { side: action.side, id: action.element.id },
        past: pushHistory(state.past, state.entries),
      };

    case "remove":
      return {
        ...state,
        entries: patchPage(
          state.entries,
          state.activeId,
          spreadIndex,
          action.side,
          (list) => list.filter((el) => el.id !== action.id),
        ),
        selected: null,
        past: pushHistory(state.past, state.entries),
      };

    case "renameEntry": {
      const title = action.title.trim();
      if (!title) return state;
      return {
        ...state,
        entries: state.entries.map((entry) =>
          entry.id === action.id ? { ...entry, title } : entry,
        ),
        past: pushHistory(state.past, state.entries),
      };
    }

    case "deleteEntry": {
      // 至少保留一本，否则整个编辑区会没有可编辑的内容
      if (state.entries.length <= 1) return state;
      const rest = state.entries.filter((entry) => entry.id !== action.id);
      if (rest.length === state.entries.length) return state;
      return {
        ...state,
        entries: rest,
        activeId: state.activeId === action.id ? rest[0].id : state.activeId,
        activeSpread: 0,
        selected: null,
        past: pushHistory(state.past, state.entries),
      };
    }

    case "setPaperTemplate":
      return {
        ...state,
        entries: state.entries.map((entry) =>
          entry.id === action.id
            ? { ...entry, paperTemplate: action.paperTemplate }
            : entry,
        ),
        past: pushHistory(state.past, state.entries),
      };

    case "setPageMargin":
      return {
        ...state,
        entries: state.entries.map((entry) =>
          entry.id === action.id
            ? { ...entry, pageMargin: action.pageMargin }
            : entry,
        ),
        past: pushHistory(state.past, state.entries),
      };

    case "goSpread": {
      const next = clampSpread(action.index, activeEntry);
      if (next === spreadIndex) return state;
      return {
        ...state,
        activeSpread: next,
        activeSide: "left",
        selected: null,
      };
    }

    case "addSpread": {
      const insertAt = spreadIndex + 1;
      const newSpread = {
        id: `spread-${Date.now().toString(36)}`,
        left: [],
        right: [],
      };
      return {
        ...state,
        entries: state.entries.map((entry) =>
          entry.id !== state.activeId
            ? entry
            : {
                ...entry,
                spreads: [
                  ...entry.spreads.slice(0, insertAt),
                  newSpread,
                  ...entry.spreads.slice(insertAt),
                ],
              },
        ),
        activeSpread: insertAt,
        activeSide: "left",
        selected: null,
        past: pushHistory(state.past, state.entries),
      };
    }

    case "removeSpread": {
      if (activeEntry.spreads.length <= 1) return state;
      if (activeSpread.left.length > 0 || activeSpread.right.length > 0) {
        return state;
      }
      return {
        ...state,
        entries: state.entries.map((entry) =>
          entry.id !== state.activeId
            ? entry
            : {
                ...entry,
                spreads: entry.spreads.filter((_, index) => index !== spreadIndex),
              },
        ),
        activeSpread: Math.max(0, spreadIndex - 1),
        activeSide: "left",
        selected: null,
        past: pushHistory(state.past, state.entries),
      };
    }

    case "undo": {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        ...state,
        entries: previous,
        past: state.past.slice(0, -1),
        selected: null,
        activeSpread: 0,
      };
    }

    case "hydrate": {
      const entry =
        action.entries.find((item) => item.id === action.activeId) ?? action.entries[0];
      const index = Math.min(
        Math.max(0, action.activeSpread ?? 0),
        entry.spreads.length - 1,
      );
      return {
        ...state,
        entries: action.entries,
        activeId: entry.id,
        activeSpread: index,
        activeSide: "left",
        selected: null,
        past: [],
      };
    }

    default:
      return state;
  }
}
