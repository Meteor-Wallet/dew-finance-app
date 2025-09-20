import Big from "big.js";

function omitText(text: string, keepAmount: number = 16): string {
  if (keepAmount >= text.length) {
    return text;
  }

  const halfToKeep = Math.floor(keepAmount / 2);

  const start = text.slice(0, halfToKeep);
  const end = text.slice(text.length - halfToKeep);

  return `${start}...${end}`;
}

function truncateDecimals(number?: string | number) {
  if(!number){
    return "0"
  }
  return Big(number).round(6, Big.roundDown).toFixed()
}

export const stringUtils = {
  omitText,
  truncateDecimals
};
