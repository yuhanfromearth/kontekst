import type { Transition } from 'motion/react';

export const springPopup: Transition = {
  type: 'spring',
  stiffness: 380,
  damping: 28,
  mass: 0.7,
};

export const springSnap: Transition = {
  type: 'spring',
  stiffness: 500,
  damping: 40,
};

export const springSoft: Transition = {
  type: 'spring',
  stiffness: 260,
  damping: 26,
};

export const tweenFast: Transition = {
  type: 'tween',
  duration: 0.18,
  ease: 'easeOut',
};
