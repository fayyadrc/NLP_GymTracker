/** Taste Standard spring physics: stiffness 100, damping 20 */
export const tasteSpring = {
  type: 'spring' as const,
  stiffness: 100,
  damping: 20,
};

export const tasteStagger = (index: number) => ({
  ...tasteSpring,
  delay: index * 0.1,
});
