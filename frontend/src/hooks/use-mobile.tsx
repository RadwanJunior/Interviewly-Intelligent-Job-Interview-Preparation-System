/**
 * use-mobile.tsx - React hook for mobile device detection
 * Provides a custom hook to determine if the viewport is below a mobile breakpoint.
 */

import * as React from "react"

/**
 * The pixel width below which the app is considered to be on a mobile device.
 */
const MOBILE_BREAKPOINT = 768

/**
 * Custom React hook to detect if the current viewport is mobile-sized.
 * Listens for window resize events and updates state accordingly.
 * @returns {boolean} True if the viewport width is less than the mobile breakpoint, false otherwise.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
