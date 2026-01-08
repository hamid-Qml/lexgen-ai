import TopBar from "@/components/topbar";
import Hero from "@/components/hero";
import Trust from "@/components/trust";
import Stats from "@/components/stats";
import FeaturedVideo from "@/components/featured_video";
import Footer from "@/components/footer";
import Action from "@/components/action";
import Benefits from "@/components/benefits";
import FAQs from "@/components/faq";
import Pricing from "@/components/pricing";

const Landing = () => {
  return (
    <>
      <div className="flex items-center justify-center w-full bg-background">
        <div className="w-full bg-background max-w-[1440px] min-w-[1080px]">
          <nav>
            <TopBar />
          </nav>
          <Hero />
          <Trust />
          <Stats />
          <Pricing />
          <Action />
          <FeaturedVideo />
          <Benefits />
          <FAQs />
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Landing;
