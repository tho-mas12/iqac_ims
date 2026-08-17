import io
import os
from datetime import datetime

def generate_pdf_report(title_name: str, title_desc: str, questions_data: list) -> bytes:
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    story = []
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#1E293B'),
        spaceAfter=6
    )

    desc_style = ParagraphStyle(
        'DocDesc',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#64748B'),
        spaceAfter=15
    )

    h2_style = ParagraphStyle(
        'H2Style',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=colors.HexColor('#0F172A'),
        spaceAfter=10
    )

    cell_style = ParagraphStyle(
        'CellText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#334155')
    )

    cell_bold = ParagraphStyle(
        'CellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#0F172A')
    )

    story.append(Paragraph("SJC IQAC - Institutional Monitoring System", title_style))
    story.append(Paragraph(f"<b>Title Category:</b> {title_name}", h2_style))
    if title_desc:
        story.append(Paragraph(title_desc, desc_style))
    story.append(Spacer(1, 10))

    table_data = [
        [
            Paragraph("<b>#</b>", cell_bold),
            Paragraph("<b>Checklist Question</b>", cell_bold),
            Paragraph("<b>Status</b>", cell_bold),
            Paragraph("<b>Timestamp / Override</b>", cell_bold)
        ]
    ]

    for idx, q in enumerate(questions_data, start=1):
        status_text = "<font color='#16A34A'><b>COMPLETED</b></font>" if q.get('is_checked') else "<font color='#DC2626'><b>PENDING</b></font>"
        time_str = q.get('ticked_at', '—')
        if time_str and time_str != '—':
            if q.get('is_manual_time'):
                time_str += " (Manual)"
        
        table_data.append([
            Paragraph(str(idx), cell_style),
            Paragraph(q.get('text', ''), cell_style),
            Paragraph(status_text, cell_style),
            Paragraph(time_str, cell_style)
        ])

    t = Table(table_data, colWidths=[30, 260, 90, 160])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F8FAFC')),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
    ]))

    story.append(t)
    story.append(Spacer(1, 20))
    story.append(Paragraph(f"<i>Report generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</i>", desc_style))

    doc.build(story)
    pdf_data = buffer.getvalue()
    buffer.close()
    return pdf_data


def generate_excel_report(title_name: str, title_desc: str, questions_data: list) -> bytes:
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

    wb = Workbook()
    ws = wb.active
    ws.title = "Audit Checklist"

    ws.merge_cells("A1:D1")
    ws["A1"] = "SJC IQAC - Institutional Monitoring System"
    ws["A1"].font = Font(name="Arial", size=14, bold=True, color="1E293B")
    ws["A1"].alignment = Alignment(horizontal="left", vertical="center")

    ws.merge_cells("A2:D2")
    ws["A2"] = f"Title: {title_name}"
    ws["A2"].font = Font(name="Arial", size=11, bold=True, color="0F172A")

    ws.append([])

    headers = ["S.No", "Checklist Question", "Completion Status", "Timestamp"]
    ws.append(headers)

    header_fill = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
    header_font = Font(name="Arial", size=10, bold=True, color="0F172A")

    for col_num in range(1, 5):
        cell = ws.cell(row=4, column=col_num)
        cell.fill = header_fill
        cell.font = header_font

    for idx, q in enumerate(questions_data, start=1):
        status_text = "COMPLETED" if q.get('is_checked') else "PENDING"
        time_str = q.get('ticked_at', '—')
        row_idx = 4 + idx
        ws.append([idx, q.get('text', ''), status_text, time_str])

        status_cell = ws.cell(row=row_idx, column=3)
        if status_text == "COMPLETED":
            status_cell.font = Font(name="Arial", size=10, bold=True, color="16A34A")
        else:
            status_cell.font = Font(name="Arial", size=10, bold=True, color="DC2626")

    ws.column_dimensions['A'].width = 8
    ws.column_dimensions['B'].width = 50
    ws.column_dimensions['C'].width = 20
    ws.column_dimensions['D'].width = 25

    buffer = io.BytesIO()
    wb.save(buffer)
    excel_data = buffer.getvalue()
    buffer.close()
    return excel_data
