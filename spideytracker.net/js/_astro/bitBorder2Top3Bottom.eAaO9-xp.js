const E="bit-border-2top3bottom-style",c="bit-border-2top3bottom",d="bit-border-2top3bottom__border",h="bit-border-2top3bottom__fill",i="bit-border-2top3bottom__hover",$=`polygon(
	0 var(--bb-step),
	var(--bb-step) var(--bb-step),
	var(--bb-step) 0,
	calc(100% - var(--bb-step)) 0,
	calc(100% - var(--bb-step)) var(--bb-step),
	100% var(--bb-step),
	100% calc(100% - 2 * var(--bb-step)),
	calc(100% - var(--bb-step)) calc(100% - 2 * var(--bb-step)),
	calc(100% - var(--bb-step)) calc(100% - var(--bb-step)),
	calc(100% - 2 * var(--bb-step)) calc(100% - var(--bb-step)),
	calc(100% - 2 * var(--bb-step)) 100%,
	calc(2 * var(--bb-step)) 100%,
	calc(2 * var(--bb-step)) calc(100% - var(--bb-step)),
	var(--bb-step) calc(100% - var(--bb-step)),
	var(--bb-step) calc(100% - 2 * var(--bb-step)),
	0 calc(100% - 2 * var(--bb-step))
)`,C=`polygon(evenodd,
	0 var(--bb-step),
	var(--bb-step) var(--bb-step),
	var(--bb-step) 0,
	calc(100% - var(--bb-step)) 0,
	calc(100% - var(--bb-step)) var(--bb-step),
	100% var(--bb-step),
	100% calc(100% - 2 * var(--bb-step)),
	calc(100% - var(--bb-step)) calc(100% - 2 * var(--bb-step)),
	calc(100% - var(--bb-step)) calc(100% - var(--bb-step)),
	calc(100% - 2 * var(--bb-step)) calc(100% - var(--bb-step)),
	calc(100% - 2 * var(--bb-step)) 100%,
	calc(2 * var(--bb-step)) 100%,
	calc(2 * var(--bb-step)) calc(100% - var(--bb-step)),
	var(--bb-step) calc(100% - var(--bb-step)),
	var(--bb-step) calc(100% - 2 * var(--bb-step)),
	0 calc(100% - 2 * var(--bb-step)),
	0 var(--bb-step),

	var(--bb-step) var(--bb-step),
	var(--bb-step) calc(100% - 2 * var(--bb-step)),
	calc(2 * var(--bb-step)) calc(100% - 2 * var(--bb-step)),
	calc(2 * var(--bb-step)) calc(100% - var(--bb-step)),
	calc(100% - 2 * var(--bb-step)) calc(100% - var(--bb-step)),
	calc(100% - 2 * var(--bb-step)) calc(100% - 2 * var(--bb-step)),
	calc(100% - var(--bb-step)) calc(100% - 2 * var(--bb-step)),
	calc(100% - var(--bb-step)) var(--bb-step),
	var(--bb-step) var(--bb-step)
)`,_=`polygon(
	var(--bb-step) var(--bb-step),
	calc(100% - var(--bb-step)) var(--bb-step),
	calc(100% - var(--bb-step)) calc(100% - 2 * var(--bb-step)),
	calc(100% - 2 * var(--bb-step)) calc(100% - 2 * var(--bb-step)),
	calc(100% - 2 * var(--bb-step)) calc(100% - var(--bb-step)),
	calc(2 * var(--bb-step)) calc(100% - var(--bb-step)),
	calc(2 * var(--bb-step)) calc(100% - 2 * var(--bb-step)),
	var(--bb-step) calc(100% - 2 * var(--bb-step))
)`;function B(){let t=document.getElementById(E);t||(t=document.createElement("style"),t.id=E,document.head.appendChild(t)),t.textContent=`
.${c} {
	--bb-step: 2px;
	--bb-frame: #000000;
	--bb-frame-hover: var(--bb-frame);
	--bb-frame-opacity-base: 1;
	--bb-frame-opacity-hover: var(--bb-frame-opacity-base);
	--bb-fill: transparent;
	--bb-fill-hover: var(--bb-fill);
	--bb-fill-opacity-base: 1;
	--bb-fill-opacity-hover: var(--bb-fill-opacity-base);
	--bb-hover-offset: 0px;
	--bb-hover-layer-fill: transparent;
	--bb-text: #000000;
	--bb-text-hover: var(--bb-text);
	position: relative;
	background: transparent;
	border: none;
	color: var(--bb-text);
	display: inline-flex;
	align-items: center;
	justify-content: center;
	outline: none;
	user-select: none;
	isolation: isolate;
	transition: color 160ms ease;
	clip-path: ${$};
}

.${d} {
	position: absolute;
	inset: 0;
	pointer-events: none;
	background: var(--bb-frame);
	opacity: var(--bb-frame-opacity-base);
	clip-path: ${C};
	z-index: -3;
	transition: background 160ms ease, opacity 160ms ease;
}

.${c}:hover .${d} {
	background: var(--bb-frame-hover);
	opacity: var(--bb-frame-opacity-hover);
}

.${h} {
	position: absolute;
	inset: 0;
	pointer-events: none;
	background: var(--bb-fill);
	opacity: var(--bb-fill-opacity-base);
	clip-path: ${_};
	z-index: -2;
	transition: background 160ms ease, opacity 160ms ease;
}

.${c}:hover .${h} {
	background: var(--bb-fill-hover);
	opacity: var(--bb-fill-opacity-hover);
}

.${i} {
	position: absolute;
	inset: var(--bb-hover-offset);
	pointer-events: none;
	background: var(--bb-hover-layer-fill);
	opacity: 0;
	clip-path: ${_};
	transition: opacity 160ms ease;
	z-index: -1;
}

.${c}:hover .${i} {
	opacity: var(--bb-fill-opacity-hover);
}
`}function I(t){if(typeof t=="string"){if(t.startsWith("."))return Array.from(document.querySelectorAll(t));if(t.startsWith("#")){const r=document.querySelector(t);return r instanceof HTMLElement?[r]:[]}const b=document.getElementById(t);return b?[b]:Array.from(document.getElementsByClassName(t)).filter(r=>r instanceof HTMLElement)}return t instanceof HTMLElement?[t]:Array.from(t).filter(b=>b instanceof HTMLElement)}function m(t,b){let r=Array.from(t.children).find(o=>o instanceof HTMLElement&&o.classList.contains(b));return r||(r=document.createElement("div"),r.className=b,r.setAttribute("aria-hidden","true"),t.prepend(r)),r}function T(t,b){Array.from(t.children).forEach(r=>{r instanceof HTMLElement&&r.classList.contains(b)&&r.remove()})}function g(t,b={},r){B();const o=I(t);return o.forEach(e=>{e.classList.add(c),m(e,d),m(e,h);const s=r!=null&&Object.keys(r).length>0,a=r??{},u=b["border-thickness"]??b.step,l=b["border-color"]??b.frame,n=b["border-opacity"]??"1",y=b["fill-opacity"]??"1",p=b.fill?.trim()||"transparent",v=b.text,L=s?a["border-color"]??a.frame??l:l,A=s?a["border-opacity"]??n:n,P=s?a.hoverOffset:void 0,f=s?a.fill??a.fillHover??void 0:void 0,S=s?a["fill-opacity"]??y:y,x=s?a.text??a.textHover??v:v;u&&e.style.setProperty("--bb-step",u),l&&e.style.setProperty("--bb-frame",l),e.style.setProperty("--bb-frame-opacity-base",n),e.style.setProperty("--bb-frame-opacity-hover",A),e.style.setProperty("--bb-fill",p),e.style.setProperty("--bb-fill-opacity-base",y),e.style.setProperty("--bb-fill-opacity-hover",S),v&&e.style.setProperty("--bb-text",v),L?e.style.setProperty("--bb-frame-hover",L):e.style.removeProperty("--bb-frame-hover"),P?(e.style.setProperty("--bb-hover-offset",P),e.style.setProperty("--bb-hover-layer-fill",f??p),e.style.setProperty("--bb-fill-hover",p),m(e,i)):(e.style.removeProperty("--bb-hover-offset"),e.style.removeProperty("--bb-hover-layer-fill"),T(e,i),f?e.style.setProperty("--bb-fill-hover",f):e.style.setProperty("--bb-fill-hover",p)),x?e.style.setProperty("--bb-text-hover",x):e.style.removeProperty("--bb-text-hover")}),o}export{g as a};
