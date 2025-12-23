import FeatVideo from "../../public/featvideo.mp4";

export default function FeaturedVideo() {
  return (
    <div className="flex flex-col items-center justify-center gap-10 px-12 py-24">
      <p className="text-center text-white text-[48px] font-medium">
        Australia’s first AI legal
        <br /> operating system
      </p>
      <div className="flex items-center justify-center p-6 max-w-[1300px] min-w-[1080px] rounded-[28px] bg-card border-[1px] border-card-border ">
        <video controls className="h-[680px]">
          <source src={FeatVideo} type="video/mp4" />
          Your browser does not support this video.
        </video>
      </div>
    </div>
  );
}
