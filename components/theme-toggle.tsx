/**
 * Theme Toggle Component
 * 
 * An animated switch for toggling between light and dark mode.
 * Features sun/moon animation with clouds, stars, and light rays.
 * Design from Uiverse.io by RiccardoRapelli
 */

"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export function ThemeToggle() {
  // Get theme state from next-themes
  const { theme, setTheme } = useTheme()
  // Prevent hydration mismatch by only rendering after mount
  const [mounted, setMounted] = useState(false)

  // Wait until component is mounted on client side
  useEffect(() => {
    setMounted(true)
  }, [])

  // Don't render anything on server to avoid hydration issues
  if (!mounted) {
    return null
  }

  /**
   * Handle theme toggle
   * Switches between 'light' and 'dark' themes
   */
  const handleToggle = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  return (
    <label className="switch">
      <input
        id="input"
        type="checkbox"
        checked={theme === "dark"}
        onChange={handleToggle}
        aria-label="Toggle theme"
      />
      <div className="slider round">
        {/* Sun/Moon circle that slides left/right */}
        <div className="sun-moon">
          {/* Moon dots (craters) - visible in dark mode */}
          <svg id="moon-dot-1" className="moon-dot" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="50"></circle>
          </svg>
          <svg id="moon-dot-2" className="moon-dot" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="50"></circle>
          </svg>
          <svg id="moon-dot-3" className="moon-dot" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="50"></circle>
          </svg>

          {/* Light rays - visible in light mode */}
          <svg id="light-ray-1" className="light-ray" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="50"></circle>
          </svg>
          <svg id="light-ray-2" className="light-ray" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="50"></circle>
          </svg>
          <svg id="light-ray-3" className="light-ray" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="50"></circle>
          </svg>

          {/* Clouds - animated movement in light mode */}
          <svg id="cloud-1" className="cloud-dark" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="50"></circle>
          </svg>
          <svg id="cloud-2" className="cloud-dark" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="50"></circle>
          </svg>
          <svg id="cloud-3" className="cloud-dark" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="50"></circle>
          </svg>
          <svg id="cloud-4" className="cloud-light" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="50"></circle>
          </svg>
          <svg id="cloud-5" className="cloud-light" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="50"></circle>
          </svg>
          <svg id="cloud-6" className="cloud-light" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="50"></circle>
          </svg>
        </div>

        {/* Stars - visible in dark mode with twinkling animation */}
        <div className="stars">
          <svg id="star-1" className="star" viewBox="0 0 20 20">
            <path d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z"></path>
          </svg>
          <svg id="star-2" className="star" viewBox="0 0 20 20">
            <path d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z"></path>
          </svg>
          <svg id="star-3" className="star" viewBox="0 0 20 20">
            <path d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z"></path>
          </svg>
          <svg id="star-4" className="star" viewBox="0 0 20 20">
            <path d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z"></path>
          </svg>
        </div>
      </div>

      {/* Inline styles for the animated switch */}
      <style jsx>{`
        /* Switch container */
        .switch {
          position: relative;
          display: inline-block;
          width: 60px;
          height: 34px;
        }

        /* Hide default checkbox */
        .switch #input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        /* Slider background track */
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #2196f3; /* Blue for light mode (day sky) */
          -webkit-transition: 0.4s;
          transition: 0.4s;
          z-index: 0;
          overflow: hidden;
        }

        /* Sun/Moon circle that slides */
        .sun-moon {
          position: absolute;
          content: "";
          height: 26px;
          width: 26px;
          left: 4px;
          bottom: 4px;
          background-color: yellow; /* Yellow sun in light mode */
          -webkit-transition: 0.4s;
          transition: 0.4s;
        }

        /* Dark mode: black background */
        #input:checked + .slider {
          background-color: black;
        }

        /* Focus state for accessibility */
        #input:focus + .slider {
          box-shadow: 0 0 1px #2196f3;
        }

        /* Dark mode: slide and transform to white moon */
        #input:checked + .slider .sun-moon {
          -webkit-transform: translateX(26px);
          -ms-transform: translateX(26px);
          transform: translateX(26px);
          background-color: white;
          -webkit-animation: rotate-center 0.6s ease-in-out both;
          animation: rotate-center 0.6s ease-in-out both;
        }

        /* Moon craters - hidden in light mode */
        .moon-dot {
          opacity: 0;
          transition: 0.4s;
          fill: gray;
        }

        /* Dark mode: show moon craters */
        #input:checked + .slider .sun-moon .moon-dot {
          opacity: 1;
        }

        /* Rounded slider and sun/moon */
        .slider.round {
          border-radius: 34px;
        }

        .slider.round .sun-moon {
          border-radius: 50%;
        }

        /* Moon crater positions */
        #moon-dot-1 {
          left: 10px;
          top: 3px;
          position: absolute;
          width: 6px;
          height: 6px;
          z-index: 4;
        }

        #moon-dot-2 {
          left: 2px;
          top: 10px;
          position: absolute;
          width: 10px;
          height: 10px;
          z-index: 4;
        }

        #moon-dot-3 {
          left: 16px;
          top: 18px;
          position: absolute;
          width: 3px;
          height: 3px;
          z-index: 4;
        }

        /* Light rays around sun - only visible in light mode */
        #light-ray-1 {
          left: -8px;
          top: -8px;
          position: absolute;
          width: 43px;
          height: 43px;
          z-index: -1;
          fill: white;
          opacity: 10%;
        }

        #light-ray-2 {
          left: -50%;
          top: -50%;
          position: absolute;
          width: 55px;
          height: 55px;
          z-index: -1;
          fill: white;
          opacity: 10%;
        }

        #light-ray-3 {
          left: -18px;
          top: -18px;
          position: absolute;
          width: 60px;
          height: 60px;
          z-index: -1;
          fill: white;
          opacity: 10%;
        }

        /* Cloud animations */
        .cloud-light {
          position: absolute;
          fill: #eee;
          animation-name: cloud-move;
          animation-duration: 6s;
          animation-iteration-count: infinite;
        }

        .cloud-dark {
          position: absolute;
          fill: #ccc;
          animation-name: cloud-move;
          animation-duration: 6s;
          animation-iteration-count: infinite;
          animation-delay: 1s;
        }

        /* Cloud positions */
        #cloud-1 {
          left: 30px;
          top: 15px;
          width: 40px;
        }

        #cloud-2 {
          left: 44px;
          top: 10px;
          width: 20px;
        }

        #cloud-3 {
          left: 18px;
          top: 24px;
          width: 30px;
        }

        #cloud-4 {
          left: 36px;
          top: 18px;
          width: 40px;
        }

        #cloud-5 {
          left: 48px;
          top: 14px;
          width: 20px;
        }

        #cloud-6 {
          left: 22px;
          top: 26px;
          width: 30px;
        }

        /* Cloud floating animation */
        @keyframes cloud-move {
          0% {
            transform: translateX(0px);
          }
          40% {
            transform: translateX(4px);
          }
          80% {
            transform: translateX(-4px);
          }
          100% {
            transform: translateX(0px);
          }
        }

        /* Stars container - hidden in light mode */
        .stars {
          transform: translateY(-32px);
          opacity: 0;
          transition: 0.4s;
        }

        /* Individual star styling */
        .star {
          fill: white;
          position: absolute;
          -webkit-transition: 0.4s;
          transition: 0.4s;
          animation-name: star-twinkle;
          animation-duration: 2s;
          animation-iteration-count: infinite;
        }

        /* Dark mode: show stars */
        #input:checked + .slider .stars {
          -webkit-transform: translateY(0);
          -ms-transform: translateY(0);
          transform: translateY(0);
          opacity: 1;
        }

        /* Star positions */
        #star-1 {
          width: 20px;
          top: 2px;
          left: 3px;
          animation-delay: 0.3s;
        }

        #star-2 {
          width: 6px;
          top: 16px;
          left: 3px;
        }

        #star-3 {
          width: 12px;
          top: 20px;
          left: 10px;
          animation-delay: 0.6s;
        }

        #star-4 {
          width: 18px;
          top: 0px;
          left: 18px;
          animation-delay: 1.3s;
        }

        /* Star twinkling animation */
        @keyframes star-twinkle {
          0% {
            transform: scale(1);
          }
          40% {
            transform: scale(1.2);
          }
          80% {
            transform: scale(0.8);
          }
          100% {
            transform: scale(1);
          }
        }

        /* Rotation animation when toggling */
        @keyframes rotate-center {
          0% {
            transform: translateX(0) rotate(0);
          }
          100% {
            transform: translateX(26px) rotate(360deg);
          }
        }
      `}</style>
    </label>
  )
}
