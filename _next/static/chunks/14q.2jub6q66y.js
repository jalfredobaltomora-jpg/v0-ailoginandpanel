(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,89945,e=>{"use strict";let t=(0,e.i(96215).default)("loader-circle",[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]]);e.s(["Loader2",0,t],89945)},37948,e=>{"use strict";let t=(0,e.i(96215).default)("printer",[["path",{d:"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2",key:"143wyd"}],["path",{d:"M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6",key:"1itne7"}],["rect",{x:"6",y:"14",width:"12",height:"8",rx:"1",key:"1ue0tg"}]]);e.s(["Printer",0,t],37948)},67303,e=>{"use strict";var t=e.i(33736),i=e.i(66417),a=e.i(37948),n=e.i(89945),r=e.i(67881);e.s(["QRLabel",0,function({equipo:e,empleadoNombre:o,size:l=80}){let d=(0,i.useRef)(null),[s,c]=(0,i.useState)(!1);(0,i.useEffect)(()=>{let t=!0;return new Promise((e,t)=>{if(window.QRCode)return e(window.QRCode);let i=document.createElement("script");i.src="/qrcode.min.js",i.onload=()=>e(window.QRCode),i.onerror=t,document.head.appendChild(i),setTimeout(()=>t(Error("QRCode load timeout")),1e4)}).then(i=>{t&&d.current&&i.toCanvas(d.current,`Cod: ${e.empleadoAsignado} | Nom: ${o}
SN: ${e.serialNumber} | Marca: ${e.marca||"-"} | Modelo: ${e.modelo||"-"}
Equipo: ${"tablet"===e.tipo?"Tablet":"Scanner"} | Fecha: ${e.mesInventario}`,{width:l,margin:1,color:{dark:"#000",light:"#fff"}},()=>{t&&c(!0)})}).catch(()=>{t&&c(!0)}),()=>{t=!1}},[e,o,l]);let m=async()=>{if(!d.current)return;let t=d.current.toDataURL("image/png");if("data:,"===t)return;let i=[`Empleado: ${e.empleadoAsignado}`,`Nombre: ${o}`,`Serie: ${e.serialNumber}`,`Marca: ${e.marca||"-"}`,`Modelo: ${e.modelo||"-"}`,`Equipo: ${"tablet"===e.tipo?"Tablet":"Scanner"}`,`Fecha Inv.: ${e.mesInventario}`],a=window.open("","_blank");a&&(a.document.write(`<!DOCTYPE html><html><head>
      <title>Etiqueta - ${e.serialNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 20px; margin: 0; }
        .label { border: 2px solid #000; padding: 16px; display: inline-block; text-align: left; font-size: 14px; }
        .label h2 { text-align: center; margin: 0 0 12px; font-size: 16px; }
        .label p { margin: 4px 0; }
        @media print { body { margin: 0; padding: 8px; } }
      </style></head><body>
      <div class="label">
        <h2>INVENTARIO - ${"tablet"===e.tipo?"TABLET":"SCANNER"}</h2>
        ${i.map(e=>`<p>${e}</p>`).join("")}
        <img src="${t}" style="width:120px;height:120px;margin:8px auto;display:block" />
      </div>
      <script>window.onload=function(){setTimeout(function(){window.print();window.close()},500)};</script>
    </body></html>`),a.document.close())};return(0,t.jsxs)("div",{className:"flex flex-col items-center gap-1",onClick:e=>e.stopPropagation(),children:[!s&&(0,t.jsx)("div",{className:"flex items-center justify-center",style:{width:l,height:l},children:(0,t.jsx)(n.Loader2,{className:"h-4 w-4 animate-spin text-muted-foreground"})}),(0,t.jsx)("canvas",{ref:d,width:l,height:l,className:`rounded ${s?"":"hidden"}`}),(0,t.jsx)(r.Button,{variant:"ghost",size:"icon",className:"h-6 w-6",onClick:m,title:"Imprimir etiqueta",children:(0,t.jsx)(a.Printer,{className:"h-3 w-3"})})]})}])},43796,e=>{e.n(e.i(67303))}]);