export const formatDate = (date: Date | string | number) => {
  const d = new Date(date);
  return d.toLocaleDateString("en-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};
