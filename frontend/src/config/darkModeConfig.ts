/**
 * Dark Mode Color Palette Configuration
 * 
 * This file defines the color mapping between light and dark modes
 * to ensure consistency across the application.
 * 
 * Primary Theme Color: #2c3968 (Navy Blue)
 */

export const darkModeColors = {
  // Backgrounds
  background: {
    primary: {
      light: '#f7f7f7',
      dark: '#0d1117'
    },
    card: {
      light: '#ffffff',
      dark: '#161b26'
    },
    elevated: {
      light: '#f5f7fa',
      dark: '#1a1f2e'
    }
  },
  
  // Text Colors
  text: {
    primary: {
      light: '#1e1e1e',
      dark: '#ffffff'
    },
    secondary: {
      light: '#666666',
      dark: '#a0a8b8'
    },
    brand: {
      light: '#2c3968',
      dark: '#4a7cf6'
    }
  },
  
  // Borders
  border: {
    default: {
      light: '#e0e0e0',
      dark: '#2d3548'
    },
    subtle: {
      light: '#d9d9d9',
      dark: '#252b3d'
    }
  },
  
  // Interactive Elements
  interactive: {
    hover: {
      light: '#f0f0f0',
      dark: '#1e2530'
    },
    active: {
      light: '#f5f7fa',
      dark: '#252b3d'
    }
  }
};

/**
 * Utility function to get dark mode class string
 * Usage: getDarkModeClasses('bg-white', 'bg-[#161b26]')
 */
export function getDarkModeClasses(lightClass: string, darkClass: string): string {
  return `${lightClass} dark:${darkClass}`;
}
