import { Order, Formula, AppConfig } from '../types';

export function printOrder(order: Order, formula: Formula, config: AppConfig) {
  const bw = order.bw;
  const numBatches = (order.qty * 1000) / bw;
  
  // Filter items based on printed columns
  const cols = formula.items.filter(it => order.st.includes(it.mt));
  
  const pw = window.open('', '_blank', 'width=1220,height=860');
  if (!pw) return;

  const styles = `
    * { margin:0; padding:0; box-sizing:border-box; font-family:'Cairo', sans-serif; }
    body { background:#fff; padding:10px; direction:rtl; }
    table { border-collapse:collapse; width:100%; }
    th, td { border:1.5px solid #1e3a5f; padding:8px; text-align:center; }
    .header { display:flex; justify-content:space-between; border-bottom:3px solid #1e3a5f; padding-bottom:10px; margin-bottom:10px; }
    .title { font-size:24px; font-weight:900; color:#1e40af; }
    .meta { font-size:12px; margin-top:5px; }
    .badge { background:#ffff00; padding:2px 8px; border:1.5px solid #000; font-weight:900; }
    @media print { .no-print { display:none; } }
  `;

  const headerHtml = `
    <div style="padding:15px; border:3px solid #1e3a5f; border-bottom:none;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div style="text-align:right; width:250px;">
          <h2 style="font-size:20px; font-weight:900; margin-bottom:2px;">${config.co}</h2>
          <h3 style="font-size:16px; font-weight:bold; color:#1e3a5f; margin-bottom:2px;">${config.fa}</h3>
          <div style="font-size:13px; color:#64748b; font-weight:bold;">ادارة الامهات - مصنع اعلاف دماص</div>
        </div>
        <div style="text-align:center; flex:1;">
          <h1 style="font-size:32px; font-weight:900; color:#1e40af; margin-bottom:8px;">بيان تصنيع علف</h1>
          <div style="border:2.5px solid #1e40af; padding:5px 25px; border-radius:10px; display:inline-block;">
             رقم التشغيلة: <span style="font-size:24px; font-weight:900; color:#1e40af;">${order.rn}</span>
          </div>
        </div>
        <div style="width:200px; text-align:left;">
          <div style="width:80px; height:80px; background-color:#1e40af; border-radius:16px; display:flex; align-items:center; justify-content:center; color:white; font-size:40px; font-weight:900;">D</div>
        </div>
      </div>
    </div>
  `;

  const infoTable = `
    <table style="margin-bottom:-1.5px;">
      <tr>
        <td style="text-align:right; width:35%;"><b>اسم العميل:</b> <span style="font-size:18px; font-weight:900;">${order.client}</span></td>
        <td style="width:20%;"><b>اليوم:</b> ${order.date}</td>
        <td style="width:25%;"><b>التاريخ:</b> ${new Date(order.date).toLocaleDateString('ar-EG')}</td>
        <td style="width:20%;"><b>الفاتورة:</b> ________</td>
      </tr>
    </table>
  `;

  const itemsTable = `
    <table>
      <thead style="background:#1e3a5f; color:#fff;">
        <tr>
          <th style="width:100px;">الخامات</th>
          ${cols.map(it => `<th>${it.mn}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        <tr style="background:#f1f5f9; font-weight:bold;">
          <td>الوزن</td>
          ${cols.map(it => `<td>${it.w}</td>`).join('')}
        </tr>
        ${Array.from({ length: 4 }).map((_, i) => `
          <tr style="height:40px;">
            <td style="background:#f8fafc; font-weight:bold;">وزنة ${i+1}</td>
            ${cols.map(() => `<td></td>`).join('')}
          </tr>
        `).join('')}
        <tr style="height:40px; background:#f0fdf4; font-weight:900; color:#166534;">
          <td>إجمالي الوزن</td>
          ${cols.map(it => `<td>${(it.w * numBatches).toFixed(1)}</td>`).join('')}
        </tr>
      </tbody>
    </table>
  `;

  const footerHtml = `
    <div style="margin-top:15px; border:2px solid #1e3a5f; padding:15px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div>إجمالي الكمية: <span class="badge" style="font-size:20px;">${order.qty}</span> طن</div>
        <div>نوع العلف: <span style="font-size:18px; font-weight:900;">${order.fmName} ${order.subtype || ''}</span></div>
        <div>عدد الباتشات: <span style="font-size:18px; font-weight:900;">${numBatches.toFixed(2)}</span></div>
      </div>
      <div style="display:flex; gap:100px; margin-top:40px; justify-content:space-around;">
        <div style="border-top:2px solid #000; padding:10px 40px; font-weight:bold;">مسئول التصنيع</div>
        <div style="border-top:2px solid #000; padding:10px 40px; font-weight:bold;">مسئول الجودة</div>
      </div>
    </div>
  `;

  pw.document.write(`
    <!DOCTYPE html>
    <html dir="rtl">
    <head>
      <title>طباعة تشغيلة - ${order.rn}</title>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
      <style>${styles}</style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom:20px;">
        <button onclick="window.print()" style="padding:10px 20px; background:#1e40af; color:#fff; border:none; border-radius:5px; cursor:pointer;">طباعة الآن</button>
      </div>
      ${headerHtml}
      ${infoTable}
      ${itemsTable}
      ${footerHtml}
    </body>
    </html>
  `);
  pw.document.close();
}
