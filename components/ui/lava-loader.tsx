// LavaLoader — animated lava-lamp style loader
// Used in the chat empty state above "Start a Conversation"
// Original CSS: Uiverse.io by andrew-manzyk

export function LavaLoader() {
  return (
    <>
      {/* Scoped styles injected inline — no extra CSS file needed */}
      <style>{`
        .lava-loader {
          --color-one: #ffbf48;
          --color-two: #be4a1d;
          --color-three: #ffbf4780;
          --color-four: #bf4a1d80;
          --color-five: #ffbf4740;
          --time-animation: 2s;
          --size: 1;
          position: relative;
          border-radius: 50%;
          transform: scale(var(--size));
          box-shadow:
            0 0 25px 0 var(--color-three),
            0 20px 50px 0 var(--color-four);
          animation: lava-colorize calc(var(--time-animation) * 3) ease-in-out infinite;
        }

        .lava-loader::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 100px;
          height: 100px;
          border-radius: 50%;
          border-top: solid 1px var(--color-one);
          border-bottom: solid 1px var(--color-two);
          background: linear-gradient(180deg, var(--color-five), var(--color-four));
          box-shadow:
            inset 0 10px 10px 0 var(--color-three),
            inset 0 -10px 10px 0 var(--color-four);
        }

        .lava-loader .lava-box {
          width: 100px;
          height: 100px;
          background: linear-gradient(
            180deg,
            var(--color-one) 30%,
            var(--color-two) 70%
          );
          mask: url(#lava-clipping);
          -webkit-mask: url(#lava-clipping);
        }

        .lava-loader svg {
          position: absolute;
        }

        .lava-loader svg #lava-clipping {
          filter: contrast(15);
          animation: lava-roundness calc(var(--time-animation) / 2) linear infinite;
        }

        .lava-loader svg #lava-clipping polygon {
          filter: blur(7px);
        }

        .lava-loader svg #lava-clipping polygon:nth-child(1) {
          transform-origin: 75% 25%;
          transform: rotate(90deg);
        }

        .lava-loader svg #lava-clipping polygon:nth-child(2) {
          transform-origin: 50% 50%;
          animation: lava-rotation var(--time-animation) linear infinite reverse;
        }

        .lava-loader svg #lava-clipping polygon:nth-child(3) {
          transform-origin: 50% 60%;
          animation: lava-rotation var(--time-animation) linear infinite;
          animation-delay: calc(var(--time-animation) / -3);
        }

        .lava-loader svg #lava-clipping polygon:nth-child(4) {
          transform-origin: 40% 40%;
          animation: lava-rotation var(--time-animation) linear infinite reverse;
        }

        .lava-loader svg #lava-clipping polygon:nth-child(5) {
          transform-origin: 40% 40%;
          animation: lava-rotation var(--time-animation) linear infinite reverse;
          animation-delay: calc(var(--time-animation) / -2);
        }

        .lava-loader svg #lava-clipping polygon:nth-child(6) {
          transform-origin: 60% 40%;
          animation: lava-rotation var(--time-animation) linear infinite;
        }

        @keyframes lava-rotation {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes lava-roundness {
          0%   { filter: contrast(15); }
          20%  { filter: contrast(3); }
          40%  { filter: contrast(3); }
          60%  { filter: contrast(15); }
          100% { filter: contrast(15); }
        }

        @keyframes lava-colorize {
          0%   { filter: hue-rotate(0deg); }
          20%  { filter: hue-rotate(-30deg); }
          40%  { filter: hue-rotate(-60deg); }
          60%  { filter: hue-rotate(-90deg); }
          80%  { filter: hue-rotate(-45deg); }
          100% { filter: hue-rotate(0deg); }
        }
      `}</style>

      <div className="lava-loader">
        {/* SVG defines the mask: black background hides, white polygons reveal the gradient */}
        <svg width="100" height="100" viewBox="0 0 100 100">
          <defs>
            <mask id="lava-clipping">
              {/* Black rectangle covers the entire canvas — hides everything by default */}
              <polygon points="0,0 100,0 100,100 0,100" fill="black" />
              {/* White polygons cut through the black — these become the visible lava blobs */}
              <polygon points="25,25 75,25 50,75" fill="white" />
              <polygon points="50,25 75,75 25,75" fill="white" />
              <polygon points="35,35 65,35 50,65" fill="white" />
              <polygon points="35,35 65,35 50,65" fill="white" />
              <polygon points="35,35 65,35 50,65" fill="white" />
              <polygon points="35,35 65,35 50,65" fill="white" />
            </mask>
          </defs>
        </svg>
        {/* The gradient fill that gets revealed through the mask's white polygons */}
        <div className="lava-box" />
      </div>
    </>
  )
}
