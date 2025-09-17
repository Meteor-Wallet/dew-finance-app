import { useIntersectionObserver } from "usehooks-ts";
import { useEffect, useState, type ReactNode } from "react";

type Direction = "up" | "down" | "left" | "right";

interface MotionCSSProps {
  children: ReactNode;
  direction?: Direction;
  duration?: number; // in ms
  delay?: number; // in seconds
  isFlex?: number;
  zIndex?: number;
}

const MotionCSS = ({
  children,
  direction = "up",
  duration = 600,
  delay = 0,
  isFlex = 0,
  zIndex = 0,
}: MotionCSSProps) => {
  const { isIntersecting, ref } = useIntersectionObserver({
    threshold: 0.1,
    freezeOnceVisible: true,
  });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isIntersecting) setVisible(true);
  }, [isIntersecting]);

  const baseClass = `
    transition-all ease-out
    opacity-0
    ${direction === "up" ? "translate-y-4" : ""}
    ${direction === "down" ? "-translate-y-4" : ""}
    ${direction === "left" ? "translate-x-4" : ""}
    ${direction === "right" ? "-translate-x-4" : ""}
  `;

  const visibleClass = "opacity-100 translate-x-0 translate-y-0";

  return (
    <div
      ref={ref}
      style={{
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}s`,
        zIndex,
        willChange: "transform, opacity",
      }}
      className={`${isFlex ? "h-full w-full" : ""} ${
        visible ? visibleClass : baseClass
      }`}
    >
      {children}
    </div>
  );
};

export default MotionCSS;
