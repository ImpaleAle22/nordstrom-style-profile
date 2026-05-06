'use client';

/**
 * Outfit Assembly Animation
 * Shows empty recipe slots being filled with clothing items
 */

export default function OutfitAssemblyAnimation() {
  return (
    <div className="w-full h-64 flex items-center justify-center">
      <svg
        viewBox="0 0 800 400"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Gradient definitions */}
          <linearGradient id="slotGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f3f4f6" />
            <stop offset="100%" stopColor="#e5e7eb" />
          </linearGradient>

          <linearGradient id="itemGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>

          {/* Subtle shadow */}
          <filter id="softGlow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Background slots - 4 empty rectangles */}
        <g className="slots" opacity="0.6">
          {/* Slot 1: Tops */}
          <rect
            x="50"
            y="80"
            width="150"
            height="180"
            rx="12"
            fill="url(#slotGradient)"
            stroke="#d1d5db"
            strokeWidth="2"
            strokeDasharray="8,4"
          >
            <animate
              attributeName="opacity"
              values="0.3;0.6;0.3"
              dur="3s"
              repeatCount="indefinite"
            />
          </rect>

          {/* Slot 2: Bottoms */}
          <rect
            x="225"
            y="80"
            width="150"
            height="180"
            rx="12"
            fill="url(#slotGradient)"
            stroke="#d1d5db"
            strokeWidth="2"
            strokeDasharray="8,4"
          >
            <animate
              attributeName="opacity"
              values="0.3;0.6;0.3"
              dur="3s"
              begin="0.3s"
              repeatCount="indefinite"
            />
          </rect>

          {/* Slot 3: Shoes */}
          <rect
            x="400"
            y="80"
            width="150"
            height="180"
            rx="12"
            fill="url(#slotGradient)"
            stroke="#d1d5db"
            strokeWidth="2"
            strokeDasharray="8,4"
          >
            <animate
              attributeName="opacity"
              values="0.3;0.6;0.3"
              dur="3s"
              begin="0.6s"
              repeatCount="indefinite"
            />
          </rect>

          {/* Slot 4: Accessories */}
          <rect
            x="575"
            y="80"
            width="150"
            height="180"
            rx="12"
            fill="url(#slotGradient)"
            stroke="#d1d5db"
            strokeWidth="2"
            strokeDasharray="8,4"
          >
            <animate
              attributeName="opacity"
              values="0.3;0.6;0.3"
              dur="3s"
              begin="0.9s"
              repeatCount="indefinite"
            />
          </rect>
        </g>

        {/* Slot Labels */}
        <g className="labels" fontSize="12" fill="#9ca3af" fontFamily="system-ui">
          <text x="125" y="290" textAnchor="middle">tops</text>
          <text x="300" y="290" textAnchor="middle">bottoms</text>
          <text x="475" y="290" textAnchor="middle">shoes</text>
          <text x="650" y="290" textAnchor="middle">accessories</text>
        </g>

        {/* Item 1: T-shirt (appears first) */}
        <g filter="url(#softGlow)">
          <path
            d="M 90 140 L 80 150 L 80 200 L 90 200 L 90 220 L 160 220 L 160 200 L 170 200 L 170 150 L 160 140 L 150 130 Q 140 125 125 125 Q 110 125 100 130 Z"
            fill="url(#itemGradient)"
            opacity="0"
          >
            <animate
              attributeName="opacity"
              values="0;1"
              dur="0.8s"
              begin="0.5s"
              fill="freeze"
            />
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0,-20;0,0"
              dur="0.8s"
              begin="0.5s"
              fill="freeze"
            />
          </path>
        </g>

        {/* Item 2: Pants (appears second) */}
        <g filter="url(#softGlow)">
          <path
            d="M 265 140 L 260 180 L 255 240 L 270 240 L 275 200 L 285 200 L 290 240 L 305 240 L 300 180 L 295 140 Z"
            fill="url(#itemGradient)"
            opacity="0"
          >
            <animate
              attributeName="opacity"
              values="0;1"
              dur="0.8s"
              begin="1s"
              fill="freeze"
            />
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0,-20;0,0"
              dur="0.8s"
              begin="1s"
              fill="freeze"
            />
          </path>
        </g>

        {/* Item 3: Shoe (appears third) */}
        <g filter="url(#softGlow)">
          <ellipse
            cx="475"
            cy="200"
            rx="50"
            ry="25"
            fill="url(#itemGradient)"
            opacity="0"
          >
            <animate
              attributeName="opacity"
              values="0;1"
              dur="0.8s"
              begin="1.5s"
              fill="freeze"
            />
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0,-20;0,0"
              dur="0.8s"
              begin="1.5s"
              fill="freeze"
            />
          </ellipse>
          <path
            d="M 440 200 Q 445 180 465 175 L 485 175 Q 505 180 510 200"
            stroke="url(#itemGradient)"
            strokeWidth="8"
            fill="none"
            opacity="0"
          >
            <animate
              attributeName="opacity"
              values="0;1"
              dur="0.8s"
              begin="1.5s"
              fill="freeze"
            />
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0,-20;0,0"
              dur="0.8s"
              begin="1.5s"
              fill="freeze"
            />
          </path>
        </g>

        {/* Item 4: Bag (appears last) */}
        <g filter="url(#softGlow)">
          <rect
            x="625"
            y="165"
            width="50"
            height="60"
            rx="8"
            fill="url(#itemGradient)"
            opacity="0"
          >
            <animate
              attributeName="opacity"
              values="0;1"
              dur="0.8s"
              begin="2s"
              fill="freeze"
            />
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0,-20;0,0"
              dur="0.8s"
              begin="2s"
              fill="freeze"
            />
          </rect>
          <path
            d="M 635 165 Q 650 150 665 165"
            stroke="url(#itemGradient)"
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
            opacity="0"
          >
            <animate
              attributeName="opacity"
              values="0;1"
              dur="0.8s"
              begin="2s"
              fill="freeze"
            />
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0,-20;0,0"
              dur="0.8s"
              begin="2s"
              fill="freeze"
            />
          </path>
        </g>

        {/* Completion sparkle effect */}
        <g opacity="0">
          <circle cx="400" cy="50" r="4" fill="#fbbf24">
            <animate
              attributeName="opacity"
              values="0;1;0"
              dur="1s"
              begin="2.5s"
              fill="freeze"
            />
          </circle>
          <circle cx="420" cy="60" r="3" fill="#fbbf24">
            <animate
              attributeName="opacity"
              values="0;1;0"
              dur="1s"
              begin="2.6s"
              fill="freeze"
            />
          </circle>
          <circle cx="380" cy="60" r="3" fill="#fbbf24">
            <animate
              attributeName="opacity"
              values="0;1;0"
              dur="1s"
              begin="2.7s"
              fill="freeze"
            />
          </circle>
        </g>

        {/* Completion text */}
        <text
          x="400"
          y="340"
          textAnchor="middle"
          fontSize="14"
          fontFamily="system-ui"
          fontWeight="600"
          fill="#6366f1"
          opacity="0"
        >
          outfit complete
          <animate
            attributeName="opacity"
            values="0;1"
            dur="0.5s"
            begin="2.8s"
            fill="freeze"
          />
        </text>
      </svg>
    </div>
  );
}
