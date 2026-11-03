/**
 * 旅行地图的数据定义与演示足迹（阶段七）。
 * 位置用百分比存，地图怎么缩放都能钉在原处。
 */
export interface TravelPhoto {
  src: string;
  iw: number;
  ih: number;
}

export interface TravelPlace {
  id: string;
  /** 地名，比如「大理」 */
  name: string;
  /** 具体的小地点，比如「洱海边」 */
  spot: string;
  /** 日期，统一存成 YYYY.MM.DD，排序和展示都靠它 */
  date: string;
  /** 呆了几天 */
  days: number;
  /** 一句话小记 */
  note: string;
  /** 地图上的位置，百分比 0~100 */
  x: number;
  y: number;
  photo?: TravelPhoto;
}

export const demoPlaces: TravelPlace[] = [
  {
    id: "place-dali",
    name: "大理",
    spot: "洱海边",
    date: "2024.08.12",
    days: 3,
    note: "骑着小电驴绕湖，风把头发吹得乱七八糟，晚上在客栈天台看星星。",
    x: 28,
    y: 58,
    photo: { src: "/images/journal/photo-lake.png", iw: 311, ih: 254 },
  },
  {
    id: "place-qingdao",
    name: "青岛",
    spot: "小麦岛",
    date: "2024.10.02",
    days: 2,
    note: "海风有点凉，买了两个烤地瓜捂手，坐在礁石上看了一整个日落。",
    x: 52,
    y: 74,
    photo: { src: "/images/journal/photo-beach.png", iw: 218, ih: 223 },
  },
  {
    id: "place-hangzhou",
    name: "杭州",
    spot: "西湖边",
    date: "2025.03.21",
    days: 2,
    note: "下着小雨，撑一把伞走完了整圈，鞋湿了也没觉得扫兴。",
    x: 33,
    y: 30,
    photo: { src: "/images/journal/photo-cloud.png", iw: 240, ih: 256 },
  },
  {
    id: "place-xiamen",
    name: "厦门",
    spot: "鼓浪屿",
    date: "2025.06.18",
    days: 4,
    note: "在小巷里迷路，反而撞见最好吃的一家沙茶面。",
    x: 66,
    y: 56,
  },
  {
    id: "place-chengdu",
    name: "成都",
    spot: "玉林路",
    date: "2025.09.30",
    days: 3,
    note: "每天下午都在同一家茶馆坐着发呆，什么也没干。",
    x: 78,
    y: 26,
  },
];

/** 输入框里的 2025-06-18 → 展示用的 2025.06.18 */
export function toDisplayDate(value: string) {
  return value.replace(/-/g, ".");
}

/** 展示用的 2025.06.18 → 日期控件要的 2025-06-18 */
export function toInputDate(value: string) {
  return value.replace(/\./g, "-");
}

/** 按日期先后排一遍，路线才是从早到晚的 */
export function sortByDate(places: TravelPlace[]) {
  return [...places].sort((a, b) => a.date.localeCompare(b.date));
}

/** 地图上显示的总天数 */
export function totalDays(places: TravelPlace[]) {
  return places.reduce((sum, place) => sum + (place.days || 0), 0);
}

/** 演示用的地图底图配色，跟手账页面同一套奶油纸色 */
export const mapPalette = {
  paper: "#f7eedb",
  paperEdge: "#e8d9bd",
  land: "#f2e4c9",
  hill: "#ebdabb",
  hillDark: "#dfcba6",
  sea: "#cfe2ee",
  seaDeep: "#bcd5e6",
  ink: "#a7957a",
  gold: "#c9a45e",
  rose: "#c98b78",
} as const;
