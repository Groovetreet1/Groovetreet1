import { useState, useEffect } from 'react';
import ThankYouPage from '../pages/ThankYouPage';

const ClickHandler = ({ children }) => {
  const [showThankYou, setShowThankYou] = useState(false);

  useEffect(() => {
    const handleClick = (event) => {
      // Only show Thank You page if it's not already open
      // and if the click is not inside the Thank You page
      if (!showThankYou && !event.target.closest('.thank-you-page')) {
        setShowThankYou(true);
      }
    };

    // Add click listener to the entire document
    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, [showThankYou]);

  const closeThankYou = () => {
    setShowThankYou(false);
  };

  return (
    <>
      {children}
      {showThankYou && <ThankYouPage isOpen={showThankYou} onClose={closeThankYou} />}
    </>
  );
};

export default ClickHandler;