function FooterBarLayout() {
  return (
    <div className="absolute content-stretch flex h-[30px] items-center justify-between left-1/2 top-1/2 translate-x-[-50%] translate-y-[-50%] w-full max-w-[1408px] px-4 md:px-6 gap-4" data-name="Footer Bar Layout">
      <div className="flex flex-col font-['Inter:Semi_Bold',sans-serif] font-semibold justify-center leading-[0] not-italic relative shrink text-[#f7f7f7] text-[0px] text-center">
        <p className="font-['Inter:Regular',sans-serif] font-normal leading-none text-[12px] md:text-[14px]">Copyright © 2025 RightToCompare. All rights reserved.</p>
      </div>
      <div className="content-start flex flex-wrap gap-[8px] items-start relative shrink-0" data-name="Footer Pill List">
        <div className="box-border content-stretch flex gap-[8px] items-center justify-center p-[8px] relative rounded-[8px] shrink-0" data-name="Navigation Pill">
          <div className="flex flex-col font-['Inter:Semi_Bold',sans-serif] font-semibold justify-center leading-[0] not-italic relative shrink-0 text-[#f7f7f7] text-[14px] text-nowrap">
            <p className="leading-none whitespace-pre">About</p>
          </div>
        </div>
        <div className="box-border content-stretch flex gap-[8px] items-center justify-center p-[8px] relative rounded-[8px] shrink-0" data-name="Navigation Pill">
          <div className="flex flex-col font-['Inter:Semi_Bold',sans-serif] font-semibold justify-center leading-[0] not-italic relative shrink-0 text-[#f7f7f7] text-[14px] text-nowrap">
            <p className="leading-none whitespace-pre">Contact</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FooterBar() {
  return (
    <div className="bg-[#2c3968] dark:bg-[#0d1117] relative size-full transition-colors duration-300" data-name="Footer Bar">
      <FooterBarLayout />
    </div>
  );
}