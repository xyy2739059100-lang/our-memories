import HeroSection from "@/components/home/HeroSection";
import PhotoGrid from "@/components/home/PhotoGrid";
import { demoMemories } from "@/lib/demo-memories";

export default function HomePage() {
  return (
    <div className="w-full scroll-smooth bg-[#fbf7ef]">
      <HeroSection />

      <section
        id="memories"
        className="mx-auto w-full max-w-[880px] scroll-mt-6 px-5 pb-6 pt-16 sm:px-8 sm:pt-24"
        aria-labelledby="recent-memories-heading"
      >
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] tracking-[0.32em] text-[#c1a472]">
              OUR RECENT MOMENTS
            </p>
            <h2
              id="recent-memories-heading"
              className="mt-2.5 font-serif text-[26px] tracking-[0.06em] text-[#54503f] sm:text-[30px]"
            >
              最近的回忆
            </h2>
          </div>
          <p className="pb-1.5 text-[11px] tracking-wider text-[#b3a08a]">
            共 {demoMemories.length} 张
          </p>
        </div>

        <div aria-hidden="true" className="mt-4 mb-9 h-px w-16 bg-[#c9a45e]/40 sm:mb-12" />

        <PhotoGrid />

        <p className="mt-12 text-center text-[11px] tracking-wider text-[#bfb2a0]">
          当前为演示照片，后续将接入真实上传
        </p>
      </section>
    </div>
  );
}
