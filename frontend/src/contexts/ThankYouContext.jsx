import { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ThankYouContext = createContext();

export const useThankYou = () => {
  const context = useContext(ThankYouContext);
  if (!context) {
    throw new Error('useThankYou must be used within a ThankYouProvider');
  }
  return context;
};

export const ThankYouProvider = ({ children }) => {
  const [showThankYou, setShowThankYou] = useState(false);
  const location = useLocation();

  // Show thank you page when clicking anywhere on any page
  useEffect(() => {
    const handleClick = () => {
      setShowThankYou(true);
    };

    // Add click listener to the entire document
    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, []);

  const closeThankYou = () => {
    setShowThankYou(false);
  };

  return (
    <ThankYouContext.Provider value={{ showThankYou, setShowThankYou, closeThankYou }}>
      {children}
      {showThankYou && (
        <div 
          className="fixed inset-0 z-50"
          onClick={closeThankYou}
          style={{ pointerEvents: 'auto' }}
        >
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={closeThankYou}
          />
        </div>
      )}
    </ThankYouContext.Provider>
  );
};