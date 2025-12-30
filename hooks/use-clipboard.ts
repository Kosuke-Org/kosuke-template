import { useState } from 'react';

export const useClipboard = () => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  };

  return { isCopied, onCopy: handleCopy };
};
