import { useEffect, useRef } from "react";
import lottie from "lottie-web";

function LottieIcon({ data, className = "h-10 w-10" }) {
  const boxRef = useRef(null);

  useEffect(() => {
    if (!boxRef.current || !data) return;

    const player = lottie.loadAnimation({
      container: boxRef.current,
      renderer: "svg",
      loop: true,
      autoplay: true,
      animationData: data,
    });

    return () => player.destroy();
  }, [data]);

  return <div ref={boxRef} className={className} />;
}

export default LottieIcon;