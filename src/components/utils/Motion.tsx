// SlideIn.jsx
import { motion, useAnimation } from "framer-motion";
import { useIntersectionObserver } from "usehooks-ts";
import { useEffect } from "react";

const slideVariants = {
  left: { hidden: { x: -50, opacity: 0 }, visible: { x: 0, opacity: 1 } },
  right: { hidden: { x: 50, opacity: 0 }, visible: { x: 0, opacity: 1 } },
  up: { hidden: { y: 50, opacity: 0 }, visible: { y: 0, opacity: 1 } },
  down: { hidden: { y: -10, opacity: 0 }, visible: { y: 0, opacity: 1 } },
  "left-up": {  hidden: { x: 30, y: 50, opacity: 0 }, visible: { x: 0, y: 0, opacity: 1 }, },
};

const Motion = ({
  children,
  direction = "up",
  duration = 0.6,
  delay = 0,
  zIndex = 0,
  isFlex = 0,
}) => {
  const controls = useAnimation();
  const { isIntersecting, ref } = useIntersectionObserver({
    threshold: 0.1,
    freezeOnceVisible: true,
  });

  useEffect(() => {
    if (isIntersecting) {
      controls.start("visible");
    }
  }, [controls, isIntersecting]);

  const variant = slideVariants[direction] || slideVariants.up;

  return (
    <motion.div
      className={isFlex ? "h-full w-full" : ""}
      ref={ref}
      style={{ willChange: "transform, opacity", zIndex: zIndex }}
      initial="hidden"
      animate={controls}
      variants={variant}
      transition={{ duration, ease: "easeOut", delay }}
    >
      {children}
    </motion.div>
  );
};

export default Motion;
