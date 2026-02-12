import { ViewportCount } from "../../store/viewportStore";

const getVideoGridClass = (count: ViewportCount): string => {
  switch (count) {
    case 1:
      return "grid-cols-1 grid-rows-1";
    case 2:
      return "grid-cols-2 grid-rows-1";
    case 4:
      return "grid-cols-2 grid-rows-2";
    default:
      return "grid-cols-2 grid-rows-2";
  }
};

export { getVideoGridClass };
