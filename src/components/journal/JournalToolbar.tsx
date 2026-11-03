interface Tool {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const tools: Tool[] = [
  {
    id: "photo",
    label: "添加图片",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-[19px] w-[19px]">
        <rect x="3" y="5" width="18" height="14" rx="2.2" />
        <circle cx="8.6" cy="10" r="1.4" />
        <path d="M5 17.2l4.2-4.2 3 3 3.2-4.2 4.1 5.4" />
      </svg>
    ),
  },
  {
    id: "text",
    label: "添加文字",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="h-[19px] w-[19px]">
        <path d="M5 6h14M12 6v13" />
      </svg>
    ),
  },
  {
    id: "sticker",
    label: "添加贴纸",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" className="h-[19px] w-[19px]">
        <path d="M12 3.4l2.4 5.9 6.2 1.5-4.7 3.9 1.5 6.2-5.4-3.4-5.4 3.4 1.5-6.2L3.4 10.8l6.2-1.5z" />
      </svg>
    ),
  },
  {
    id: "cutout",
    label: "抠图",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-[19px] w-[19px]">
        <circle cx="7" cy="7" r="2.6" />
        <circle cx="7" cy="17" r="2.6" />
        <path d="M9.6 7H17a2 2 0 0 1 2 2v8" />
        <path d="M13.5 10.5l4 3.2-4 3.2" />
      </svg>
    ),
  },
  {
    id: "undo",
    label: "撤销",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-[19px] w-[19px]">
        <path d="M9 8L4.5 12.2 9 16.4" />
        <path d="M4.8 12.2h9.4a4.6 4.6 0 0 1 0 9.2h-1.6" />
      </svg>
    ),
  },
];

interface JournalToolbarProps {
  onTool: (id: string) => void;
  activeTool: string | null;
}

export default function JournalToolbar({
  onTool,
  activeTool,
}: JournalToolbarProps) {
  return (
    <div className="flex w-full flex-row justify-center lg:w-[62px] lg:shrink-0 lg:flex-col lg:justify-start">
      <div className="flex flex-row divide-x divide-[#efe3cd] rounded-[13px] border border-[#e5d7bf] bg-[#fffdf8]/92 px-1 shadow-[0_3px_10px_rgba(140,115,80,0.10)] backdrop-blur-[2px] lg:flex-col lg:divide-x-0 lg:divide-y lg:px-0">
        {tools.map((tool) => (
          <button
            key={tool.id}
            type="button"
            title={tool.label}
            aria-pressed={activeTool === tool.id}
            onClick={() => onTool(tool.id)}
            className={`group flex flex-1 flex-col items-center gap-1.5 px-3 py-2.5 transition hover:text-[#7b6444] lg:px-0 lg:py-3 ${
              activeTool === tool.id
                ? "bg-[#f6ecd4]/80 text-[#7b6444]"
                : "text-[#a08b6e]"
            }`}
          >
            {tool.icon}
            <span className="whitespace-nowrap text-[0.55rem] tracking-wide text-[#9a8b76] group-hover:text-[#7b6444] lg:text-[0.6rem]">
              {tool.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
