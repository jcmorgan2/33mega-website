"""Build the two-page A4 datasheet for The Atom.

Output: public/downloads/33mega-the-atom-datasheet.pdf

Brand: 33Mega pop-art palette used as accents on a restrained, engineering-tone
layout (matching the site's "serious diagrams" rule for technical collateral).
"""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, Table, TableStyle,
    NextPageTemplate, PageBreak, Flowable,
)

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "downloads" / "33mega-the-atom-datasheet.pdf"

PAGE_W, PAGE_H = A4

# Palette
INK = colors.HexColor("#17121f")
INK_SOFT = colors.HexColor("#3d3549")
PAPER = colors.HexColor("#fff9ef")
PAPER_DIM = colors.HexColor("#f7efdd")
CYAN = colors.HexColor("#2bd4ff")
CYAN_DEEP = colors.HexColor("#0aa6d6")
VIOLET = colors.HexColor("#9d7bff")
MAGENTA = colors.HexColor("#f0439c")
MAGENTA_DEEP = colors.HexColor("#c9247c")
GOLD = colors.HexColor("#e8a33d")
GOLD_SOFT = colors.HexColor("#f3c66f")
LINE = colors.HexColor("#d9d2c2")
WHITE = colors.white

MARGIN = 14 * mm
HEADER_H = 34 * mm
FOOTER_H = 14 * mm

body = ParagraphStyle(
    "body", fontName="Helvetica", fontSize=8.6, leading=12, textColor=INK,
    spaceAfter=4,
)
lead = ParagraphStyle(
    "lead", parent=body, fontSize=9.6, leading=13.5, textColor=INK_SOFT,
)
h2 = ParagraphStyle(
    "h2", fontName="Helvetica-Bold", fontSize=11.5, leading=14, textColor=INK,
    spaceBefore=7, spaceAfter=3,
)
h3 = ParagraphStyle(
    "h3", fontName="Helvetica-Bold", fontSize=9, leading=12, textColor=MAGENTA_DEEP,
    spaceBefore=4, spaceAfter=2,
)
bullet = ParagraphStyle(
    "bullet", parent=body, leftIndent=8, bulletIndent=0, spaceAfter=2.5,
)
small = ParagraphStyle(
    "small", parent=body, fontSize=7.6, leading=10, textColor=INK_SOFT,
)


def bullets(items):
    return [Paragraph(f'<bullet color="#c9247c">▪</bullet> {t}', bullet) for t in items]


def draw_atom(canvas, cx, cy, r, stroke=2.2):
    """The 33Mega atom mark: rotated square, two orbits, nucleus."""
    canvas.saveState()
    canvas.translate(cx, cy)
    # rotated square
    canvas.setStrokeColor(VIOLET)
    canvas.setLineWidth(stroke)
    canvas.saveState()
    canvas.rotate(45)
    s = r * 0.80
    canvas.rect(-s / 2, -s / 2, s, s, stroke=1, fill=0)
    canvas.restoreState()
    # orbits
    for angle, col in ((-32, CYAN_DEEP), (32, MAGENTA)):
        canvas.saveState()
        canvas.rotate(angle)
        canvas.setStrokeColor(col)
        canvas.setLineWidth(stroke)
        canvas.ellipse(-r * 0.84, -r * 0.33, r * 0.84, r * 0.33, stroke=1, fill=0)
        canvas.restoreState()
    canvas.setFillColor(MAGENTA_DEEP)
    canvas.circle(0, 0, r * 0.16, stroke=0, fill=1)
    canvas.restoreState()


def draw_sparkle(canvas, cx, cy, r, col=GOLD):
    canvas.saveState()
    canvas.setFillColor(col)
    p = canvas.beginPath()
    p.moveTo(cx, cy + r)
    p.curveTo(cx + r * 0.12, cy + r * 0.12, cx + r * 0.12, cy + r * 0.12, cx + r, cy)
    p.curveTo(cx + r * 0.12, cy - r * 0.12, cx + r * 0.12, cy - r * 0.12, cx, cy - r)
    p.curveTo(cx - r * 0.12, cy - r * 0.12, cx - r * 0.12, cy - r * 0.12, cx - r, cy)
    p.curveTo(cx - r * 0.12, cy + r * 0.12, cx - r * 0.12, cy + r * 0.12, cx, cy + r)
    p.close()
    canvas.drawPath(p, stroke=0, fill=1)
    canvas.restoreState()


def header_footer(canvas, _doc, first_page):
    canvas.saveState()
    # page background
    canvas.setFillColor(PAPER)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)

    # header band
    canvas.setFillColor(INK)
    canvas.rect(0, PAGE_H - HEADER_H, PAGE_W, HEADER_H, fill=1, stroke=0)
    # gradient-ish accent rule under the header
    seg = PAGE_W / 3
    for i, col in enumerate((CYAN, VIOLET, MAGENTA)):
        canvas.setFillColor(col)
        canvas.rect(i * seg, PAGE_H - HEADER_H - 1.6 * mm, seg, 1.6 * mm, fill=1, stroke=0)

    draw_atom(canvas, MARGIN + 9 * mm, PAGE_H - HEADER_H / 2, 11 * mm)
    x = MARGIN + 22 * mm
    canvas.setFillColor(WHITE)
    canvas.setFont("Helvetica-Bold", 21)
    canvas.drawString(x, PAGE_H - 14.5 * mm, "The Atom")
    canvas.setFillColor(GOLD_SOFT)
    canvas.setFont("Helvetica-Bold", 9.5)
    canvas.drawString(x, PAGE_H - 20.5 * mm, "File and object storage for media workflows. One system. Fully supported.")
    canvas.setFillColor(colors.HexColor("#b9b3c6"))
    canvas.setFont("Helvetica", 8)
    canvas.drawString(x, PAGE_H - 26 * mm, "Built on Ceph and standard Dell hardware — designed, delivered and supported by 33Mega.")
    canvas.setFillColor(WHITE)
    canvas.setFont("Helvetica-Bold", 10)
    canvas.drawRightString(PAGE_W - MARGIN, PAGE_H - 14.5 * mm, "33MEGA")
    canvas.setFillColor(GOLD_SOFT)
    canvas.setFont("Helvetica", 7.5)
    canvas.drawRightString(PAGE_W - MARGIN, PAGE_H - 19 * mm, "DATASHEET" + ("" if first_page else " · PAGE 2"))
    draw_sparkle(canvas, PAGE_W - MARGIN - 44 * mm, PAGE_H - 10 * mm, 2.6 * mm)
    draw_sparkle(canvas, PAGE_W - MARGIN - 38 * mm, PAGE_H - 25 * mm, 1.8 * mm)

    # footer band
    canvas.setFillColor(INK)
    canvas.rect(0, 0, PAGE_W, FOOTER_H, fill=1, stroke=0)
    canvas.setFillColor(WHITE)
    canvas.setFont("Helvetica-Bold", 8)
    canvas.drawString(MARGIN, 5.4 * mm, "33mega.cloud")
    canvas.setFillColor(colors.HexColor("#b9b3c6"))
    canvas.setFont("Helvetica", 7.5)
    canvas.drawCentredString(PAGE_W / 2, 5.4 * mm, "Every human. 33 megatons of good.")
    canvas.drawRightString(PAGE_W - MARGIN, 5.4 * mm, "33@33mega.cloud  ·  Cardiff, UK")
    canvas.restoreState()


class ArchDiagram(Flowable):
    """Simplified Atom architecture flow in the restrained engineering style."""

    def __init__(self, width, height=52 * mm):
        super().__init__()
        self.width = width
        self.height = height

    def draw(self):
        c = self.canv
        w, h = self.width, self.height
        line = colors.HexColor("#4a4458")
        muted = colors.HexColor("#5c5570")

        def box(x, y, bw, bh, title, lines, fill=WHITE, dashed=False):
            c.saveState()
            c.setStrokeColor(line)
            c.setLineWidth(1)
            if dashed:
                c.setDash(3, 2)
            c.setFillColor(fill)
            c.roundRect(x, y, bw, bh, 2 * mm, stroke=1, fill=1)
            c.setDash()
            c.setFillColor(INK)
            c.setFont("Helvetica-Bold", 7.6)
            c.drawString(x + 3 * mm, y + bh - 5 * mm, title)
            c.setFont("Helvetica", 6.8)
            c.setFillColor(muted)
            for i, t in enumerate(lines):
                c.drawString(x + 3 * mm, y + bh - (9 + i * 3.6) * mm, t)
            c.restoreState()

        def arrow(x1, y1, x2):
            c.saveState()
            c.setStrokeColor(line)
            c.setLineWidth(1)
            c.line(x1, y1, x2 - 1.6 * mm, y1)
            c.setFillColor(line)
            p = c.beginPath()
            p.moveTo(x2, y1)
            p.lineTo(x2 - 2.2 * mm, y1 + 1.1 * mm)
            p.lineTo(x2 - 2.2 * mm, y1 - 1.1 * mm)
            p.close()
            c.drawPath(p, stroke=0, fill=1)
            c.restoreState()

        col_w = (w - 24 * mm) / 4
        gap = 8 * mm
        y0 = 4 * mm
        bh = h - 12 * mm
        xs = [i * (col_w + gap) for i in range(4)]

        c.setFillColor(muted)
        c.setFont("Helvetica-Bold", 6.4)
        c.drawString(xs[0], h - 3 * mm, "MEDIA WORKFLOWS")
        c.drawString(xs[1], h - 3 * mm, "STANDARD PROTOCOLS")
        c.drawString(xs[2], h - 3 * mm, "THE ATOM · CEPH CLUSTER")
        c.drawString(xs[3], h - 3 * mm, "MANAGED BY 33MEGA")

        box(xs[0], y0, col_w, bh, "Clients & applications",
            ["Edit and finishing suites", "MAM / PAM / DAM", "Transcode, QC, delivery",
             "Cloud & AI pipelines", "VMs and databases"])
        box(xs[1], y0, col_w, bh, "Access services",
            ["SMB / NFS with POSIX", "Standards-compliant S3", "RBD block devices",
             "One namespace", "Open formats at rest"], fill=colors.HexColor("#f6f4fa"))
        box(xs[2], y0, col_w, bh, "Self-healing cluster",
            ["Standard Dell servers", "NVMe acceleration", "Replication / erasure coding",
             "Automatic rebuild on failure", "~100 TB to multi-PB"], fill=colors.HexColor("#edeaf4"))
        box(xs[3], y0, col_w, bh, "Support & operations",
            ["24×7 monitoring", "Managed upgrades", "4-hour software SLA",
             "NBD hardware replacement", "One team, end to end"], dashed=True)

        mid = y0 + bh / 2
        arrow(xs[0] + col_w, mid, xs[1])
        arrow(xs[1] + col_w, mid, xs[2])
        arrow(xs[2] + col_w, mid, xs[3])


def two_col(left, right, left_w=0.5):
    content_w = PAGE_W - 2 * MARGIN
    lw = content_w * left_w
    t = Table([[left, right]], colWidths=[lw, content_w - lw])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (0, 0), 0),
        ("RIGHTPADDING", (0, 0), (0, 0), 5 * mm),
        ("LEFTPADDING", (1, 0), (1, 0), 5 * mm),
        ("RIGHTPADDING", (1, 0), (1, 0), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    return t


def panel(flowables, fill=WHITE, border=INK):
    content_w = PAGE_W - 2 * MARGIN
    t = Table([[flowables]], colWidths=[content_w])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), fill),
        ("BOX", (0, 0), (-1, -1), 1.2, border),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return t


def build():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = BaseDocTemplate(
        str(OUTPUT), pagesize=A4,
        leftMargin=MARGIN, rightMargin=MARGIN,
        topMargin=HEADER_H + 6 * mm, bottomMargin=FOOTER_H + 5 * mm,
        title="The Atom — 33Mega datasheet",
        author="33Mega",
    )
    frame = Frame(MARGIN, FOOTER_H + 5 * mm, PAGE_W - 2 * MARGIN,
                  PAGE_H - HEADER_H - FOOTER_H - 11 * mm, id="main")
    doc.addPageTemplates([
        PageTemplate(id="first", frames=[frame],
                     onPage=lambda c, d: header_footer(c, d, True)),
        PageTemplate(id="rest", frames=[frame],
                     onPage=lambda c, d: header_footer(c, d, False)),
    ])

    story = []

    story.append(Paragraph(
        "The Atom is 33Mega's storage platform: file and object storage for media workflows, "
        "delivered as a single, fully managed system, built on Ceph and standard Dell hardware. "
        "No proprietary hardware, no proprietary software licences, no forced refresh cycles — a supported "
        "product with the economics and openness of open source.", lead))
    story.append(Spacer(1, 3 * mm))

    left = [
        Paragraph("One platform: file, object and block", h2),
        Paragraph(
            "High-performance file storage (SMB and NFS with full POSIX support) and "
            "standards-compliant S3 object storage from a single system, under one namespace, "
            "supported by one team. Block volumes serve the infrastructure around your content — "
            "virtualisation, databases, playout. Editing, archive, content management, cloud "
            "integration and AI workloads run against the same platform.", body),
        Paragraph("Built for performance", h2),
        Paragraph(
            "NVMe storage accelerates metadata and active workloads, and intelligent data "
            "placement sustains throughput for high-bitrate video and restores from archive. "
            "Performance scales with the cluster as it grows — a property of the architecture, "
            "not a promise.", body),
        Paragraph("Open by design", h2),
        Paragraph(
            "The Atom is powered by Ceph, the open-source storage platform behind CERN's "
            "scientific data and many of the world's largest clouds, with more than 10,000 "
            "deployments worldwide. No proprietary file systems, no closed formats, no dependence "
            "on a single vendor's roadmap. Your data remains readable by open tools for as long "
            "as you keep it.", body),
    ]
    right = [
        Paragraph("Reliable by architecture", h2),
        Paragraph(
            "Data is stored in multiple copies or erasure-coded across the cluster. The platform "
            "is self-healing: when a drive or server fails, data is rebuilt automatically and "
            "operation continues. Hardware failure is an expected event, not an emergency.", body),
        Paragraph("Fully managed, fully supported", h2),
        *bullets([
            "24×7 software monitoring and support",
            "Four-hour software SLA — contractual",
            "Proactive management, software updates and lifecycle management",
            "Next-business-day hardware replacement",
            "End-to-end ownership by a single team",
        ]),
        Paragraph("Custom management interface", h2),
        Paragraph(
            "Our custom management interface makes handling the Ceph cluster a breeze — "
            "upgrades, hardware fault location and performance profiling at the touch of a "
            "button. Leave it all to our engineers, or hook event notifications into your own "
            "monitoring. Everything is possible.", body),
    ]
    story.append(two_col(left, right))
    story.append(Spacer(1, 4 * mm))

    story.append(Paragraph("Architecture", h2))
    story.append(ArchDiagram(PAGE_W - 2 * MARGIN))
    story.append(Spacer(1, 3 * mm))

    story.append(NextPageTemplate("rest"))
    story.append(PageBreak())

    # ---- page 2 ----
    left2 = [
        Paragraph("Built for media", h2),
        Paragraph(
            "The Atom was designed by people who have spent decades in broadcast, "
            "post-production, sport and archive. It expects large files, millions of objects, "
            "mixed file-and-object workflows, high-throughput editing, long-term preservation "
            "and integration with content management systems — because those are the "
            "environments its designers came from. AI, backup and general enterprise workloads "
            "run well on the platform; media is who it was built for.", body),
        Paragraph("Built around your requirements", h2),
        Paragraph(
            "Every deployment is designed around the workflow it serves — capacity from around "
            "100 TB to multiple petabytes, performance sized to the job, and growth added "
            "without disruption or data migration.", body),
        Paragraph("Lower cost, explained", h2),
        Paragraph(
            "The Atom costs less for structural reasons, not promotional ones: standard hardware "
            "bought at market prices, open-source software with no proprietary licence, and a "
            "lean company without enterprise-vendor overhead. You pay for hardware and for "
            "support — the two things that actually cost money.", body),
        Paragraph("What support means in practice", h2),
        Paragraph(
            "One number to call, answered by media workflow experts rather than a triage script. We "
            "monitor the platform continuously and usually see problems before you do. Upgrades "
            "are planned, tested and performed by us. Hardware faults are handled end to end — "
            "we coordinate replacement and reintegration, so you never manage two vendors.", body),
    ]
    right2 = [
        Paragraph("If you ever leave us", h2),
        Paragraph(
            "This is the section no vendor writes, so we will. If 33Mega disappeared tomorrow, "
            "or you simply chose to go elsewhere: your hardware is yours — standard and "
            "reusable. Your data sits in Ceph, open-source software with a large global "
            "community and multiple commercial support providers. Your applications talk to it "
            "over standard S3 and file protocols. Off-boarding is documented, not discovered.", body),
        Paragraph("<i>We believe making it easy to leave is the best reason to stay.</i>",
                  ParagraphStyle("quote", parent=body, textColor=MAGENTA_DEEP,
                                 fontName="Helvetica-Bold")),
        Paragraph("Typical use cases", h2),
        *bullets([
            "Shared editing and finishing workspaces (SMB / NFS / POSIX)",
            "Content archive and long-term preservation in open formats",
            "MAM, PAM and DAM integration over standards-compliant S3",
            "Nearline libraries for fast partial restores to the edit",
            "Backup targets with versioning and protected retention",
            "AI and ML pipelines reading straight from the library",
            "Block volumes for VMs, databases and playout infrastructure",
        ]),
    ]
    story.append(two_col(left2, right2))
    story.append(Spacer(1, 2 * mm))

    story.append(Paragraph("Technical highlights", h2))
    spec_rows = [
        ("Storage services", "Unified file and S3 object storage under one namespace; block volumes for supporting infrastructure"),
        ("Software", "Ceph open-source storage software — proven at CERN, 10,000+ deployments worldwide"),
        ("Hardware", "Standard Dell enterprise servers with NVMe acceleration, owned by you"),
        ("Scale", "From ~100 TB to multiple petabytes, expanded without disruption or data migration"),
        ("Management", "Fully managed: 24×7 monitoring, managed upgrades and lifecycle management"),
        ("Support", "Four-hour software SLA; next-business-day hardware replacement — contractual"),
        ("Protocols", "Standards-compliant S3 API; SMB and NFS file protocols with POSIX support; RBD block devices"),
        ("Data protection", "Replication or erasure coding, self-healing on drive or node failure"),
        ("Lock-in", "None: no proprietary hardware, software or formats; documented off-boarding"),
        ("Deployment", "On-premises today; hybrid cloud to follow"),
    ]
    spec = Table(
        [[Paragraph(f"<b>{k}</b>", body), Paragraph(v, body)] for k, v in spec_rows],
        colWidths=[(PAGE_W - 2 * MARGIN) * 0.24, (PAGE_W - 2 * MARGIN) * 0.76],
    )
    spec.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), PAPER_DIM),
        ("BACKGROUND", (1, 0), (1, -1), WHITE),
        ("BOX", (0, 0), (-1, -1), 1.2, INK),
        ("LINEBELOW", (0, 0), (-1, -2), 0.6, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 2.6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2.6),
    ]))
    story.append(spec)
    story.append(Spacer(1, 3 * mm))

    story.append(panel([
        Paragraph("Design an Atom around your workflow", ParagraphStyle(
            "cta", parent=h2, spaceBefore=0, textColor=INK)),
        Paragraph(
            "Tell us about the workflow — capacity, performance, growth, integrations — and "
            "we'll come back with a design and a number. Talk to a media workflow specialist, "
            "not a sales script:  <b>33@33mega.cloud</b>  ·  <b>33mega.cloud/contact</b>", body),
    ], fill=colors.HexColor("#fff0d4")))

    doc.build(story)
    print(f"Wrote {OUTPUT} ({OUTPUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    build()
