const E="bit-border-3step-style",o="bit-border-3step",m="bit-border-3step__border",h="bit-border-3step__fill",i="bit-border-3step__hover",O=`polygon(
	0 calc(2 * var(--bb-step)),
	var(--bb-step) calc(2 * var(--bb-step)),
	var(--bb-step) var(--bb-step),
	calc(2 * var(--bb-step)) var(--bb-step),
	calc(2 * var(--bb-step)) 0,
	calc(100% - 2 * var(--bb-step)) 0,
	calc(100% - 2 * var(--bb-step)) var(--bb-step),
	calc(100% - var(--bb-step)) var(--bb-step),
	calc(100% - var(--bb-step)) calc(2 * var(--bb-step)),
	100% calc(2 * var(--bb-step)),
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
)`,T=`polygon(evenodd,
	0 calc(2 * var(--bb-step)),
	var(--bb-step) calc(2 * var(--bb-step)),
	var(--bb-step) var(--bb-step),
	calc(2 * var(--bb-step)) var(--bb-step),
	calc(2 * var(--bb-step)) 0,
	calc(100% - 2 * var(--bb-step)) 0,
	calc(100% - 2 * var(--bb-step)) var(--bb-step),
	calc(100% - var(--bb-step)) var(--bb-step),
	calc(100% - var(--bb-step)) calc(2 * var(--bb-step)),
	100% calc(2 * var(--bb-step)),
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
	0 calc(2 * var(--bb-step)),

	calc(2 * var(--bb-step)) var(--bb-step),
	calc(100% - 2 * var(--bb-step)) var(--bb-step),
	calc(100% - 2 * var(--bb-step)) calc(2 * var(--bb-step)),
	calc(100% - var(--bb-step)) calc(2 * var(--bb-step)),
	calc(100% - var(--bb-step)) calc(100% - 2 * var(--bb-step)),
	calc(100% - 2 * var(--bb-step)) calc(100% - 2 * var(--bb-step)),
	calc(100% - 2 * var(--bb-step)) calc(100% - var(--bb-step)),
	calc(2 * var(--bb-step)) calc(100% - var(--bb-step)),
	calc(2 * var(--bb-step)) calc(100% - 2 * var(--bb-step)),
	var(--bb-step) calc(100% - 2 * var(--bb-step)),
	var(--bb-step) calc(2 * var(--bb-step)),
	calc(2 * var(--bb-step)) calc(2 * var(--bb-step)),
	calc(2 * var(--bb-step)) var(--bb-step)
)`,_=`polygon(
	calc(2 * var(--bb-step)) var(--bb-step),
	calc(100% - 2 * var(--bb-step)) var(--bb-step),
	calc(100% - 2 * var(--bb-step)) calc(2 * var(--bb-step)),
	calc(100% - var(--bb-step)) calc(2 * var(--bb-step)),
	calc(100% - var(--bb-step)) calc(100% - 2 * var(--bb-step)),
	calc(100% - 2 * var(--bb-step)) calc(100% - 2 * var(--bb-step)),
	calc(100% - 2 * var(--bb-step)) calc(100% - var(--bb-step)),
	calc(2 * var(--bb-step)) calc(100% - var(--bb-step)),
	calc(2 * var(--bb-step)) calc(100% - 2 * var(--bb-step)),
	var(--bb-step) calc(100% - 2 * var(--bb-step)),
	var(--bb-step) calc(2 * var(--bb-step)),
	calc(2 * var(--bb-step)) calc(2 * var(--bb-step))
)`;function $(){let b=document.getElementById(E);b||(b=document.createElement("style"),b.id=E,document.head.appendChild(b)),b.textContent=`
.${o} {
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
	clip-path: ${O};
}

.${m} {
	position: absolute;
	inset: 0;
	pointer-events: none;
	background: var(--bb-frame);
	opacity: var(--bb-frame-opacity-base);
	clip-path: ${T};
	z-index: -3;
	transition: background 160ms ease, opacity 160ms ease;
}

.${o}:hover .${m} {
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

.${o}:hover .${h} {
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

.${o}:hover .${i} {
	opacity: var(--bb-fill-opacity-hover);
}
`}function S(b){if(typeof b=="string"){if(b.startsWith("."))return Array.from(document.querySelectorAll(b));if(b.startsWith("#")){const t=document.querySelector(b);return t instanceof HTMLElement?[t]:[]}const r=document.getElementById(b);return r?[r]:Array.from(document.getElementsByClassName(b)).filter(t=>t instanceof HTMLElement)}return b instanceof HTMLElement?[b]:Array.from(b).filter(r=>r instanceof HTMLElement)}function d(b,r){let t=Array.from(b.children).find(s=>s instanceof HTMLElement&&s.classList.contains(r));return t||(t=document.createElement("div"),t.className=r,t.setAttribute("aria-hidden","true"),b.prepend(t)),t}function I(b,r){Array.from(b.children).forEach(t=>{t instanceof HTMLElement&&t.classList.contains(r)&&t.remove()})}function g(b,r={},t){$();const s=S(b);return s.forEach(e=>{e.classList.add(o),d(e,m),d(e,h);const c=t!=null&&Object.keys(t).length>0,a=t??{},u=r["border-thickness"]??r.step,l=r["border-color"]??r.frame,n=r["border-opacity"]??"1",y=r["fill-opacity"]??"1",p=r.fill?.trim()||"transparent",v=r.text,L=c?a["border-color"]??a.frame??l:l,C=c?a["border-opacity"]??n:n,P=c?a.hoverOffset:void 0,f=c?a.fill??a.fillHover??void 0:void 0,A=c?a["fill-opacity"]??y:y,x=c?a.text??a.textHover??v:v;u&&e.style.setProperty("--bb-step",u),l&&e.style.setProperty("--bb-frame",l),e.style.setProperty("--bb-frame-opacity-base",n),e.style.setProperty("--bb-frame-opacity-hover",C),e.style.setProperty("--bb-fill",p),e.style.setProperty("--bb-fill-opacity-base",y),e.style.setProperty("--bb-fill-opacity-hover",A),v&&e.style.setProperty("--bb-text",v),L?e.style.setProperty("--bb-frame-hover",L):e.style.removeProperty("--bb-frame-hover"),P?(e.style.setProperty("--bb-hover-offset",P),e.style.setProperty("--bb-hover-layer-fill",f??p),e.style.setProperty("--bb-fill-hover",p),d(e,i)):(e.style.removeProperty("--bb-hover-offset"),e.style.removeProperty("--bb-hover-layer-fill"),I(e,i),f?e.style.setProperty("--bb-fill-hover",f):e.style.setProperty("--bb-fill-hover",p)),x?e.style.setProperty("--bb-text-hover",x):e.style.removeProperty("--bb-text-hover")}),s}export{g as a};
