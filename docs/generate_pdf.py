"""
ESS HR Mobile App — System Architecture PDF Generator
Generates: ESS_Architecture.pdf
Run with: python generate_pdf.py
"""

import os
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.lib.units import mm, cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    KeepTogether, HRFlowable
)
from reportlab.platypus.flowables import Flowable
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.graphics.shapes import Drawing, Rect, String, Line, Polygon, Circle, Group
from reportlab.graphics import renderPDF
from reportlab.platypus import Image
from reportlab.graphics.shapes import (
    Drawing, Rect, String, Line, Polygon, Group, Path
)

# ─────────────────────────────────────────────
# COLOUR PALETTE
# ─────────────────────────────────────────────
C_NAVY      = colors.HexColor("#1A2B4A")
C_BLUE      = colors.HexColor("#2563EB")
C_LIGHT_BLUE= colors.HexColor("#DBEAFE")
C_TEAL      = colors.HexColor("#0D9488")
C_LIGHT_TEAL= colors.HexColor("#CCFBF1")
C_PURPLE    = colors.HexColor("#7C3AED")
C_LIGHT_PUR = colors.HexColor("#EDE9FE")
C_ORANGE    = colors.HexColor("#EA580C")
C_LIGHT_ORG = colors.HexColor("#FFEDD5")
C_GREEN     = colors.HexColor("#16A34A")
C_LIGHT_GRN = colors.HexColor("#DCFCE7")
C_RED       = colors.HexColor("#DC2626")
C_LIGHT_RED = colors.HexColor("#FEE2E2")
C_GREY_BG   = colors.HexColor("#F8FAFC")
C_GREY_LINE = colors.HexColor("#CBD5E1")
C_GREY_TEXT = colors.HexColor("#475569")
C_WHITE     = colors.white
C_BLACK     = colors.HexColor("#0F172A")
C_YELLOW    = colors.HexColor("#CA8A04")
C_LIGHT_YEL = colors.HexColor("#FEF9C3")

PAGE_W, PAGE_H = landscape(A4)
MARGIN = 18 * mm
CONTENT_W = PAGE_W - 2 * MARGIN

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "ESS_Architecture.pdf")


# ─────────────────────────────────────────────
# CUSTOM FLOWABLE: Diagram Canvas
# ─────────────────────────────────────────────
class DiagramFlowable(Flowable):
    def __init__(self, draw_fn, width, height):
        super().__init__()
        self.draw_fn = draw_fn
        self.width = width
        self.height = height

    def draw(self):
        self.draw_fn(self.canv, self.width, self.height)

    def wrap(self, aW, aH):
        return self.width, self.height


# ─────────────────────────────────────────────
# HELPER DRAWING FUNCTIONS
# ─────────────────────────────────────────────
def rounded_box(c, x, y, w, h, fill_color, stroke_color, radius=4,
                label=None, label_color=C_WHITE, font="Helvetica-Bold", font_size=9):
    c.saveState()
    c.setFillColor(fill_color)
    c.setStrokeColor(stroke_color)
    c.setLineWidth(1.2)
    c.roundRect(x, y, w, h, radius, fill=1, stroke=1)
    if label:
        c.setFillColor(label_color)
        c.setFont(font, font_size)
        c.drawCentredString(x + w / 2, y + h / 2 - font_size * 0.35, label)
    c.restoreState()


def arrow_right(c, x1, y, x2, color=C_GREY_LINE, label=None):
    c.saveState()
    c.setStrokeColor(color)
    c.setFillColor(color)
    c.setLineWidth(1.5)
    c.line(x1, y, x2 - 5, y)
    # arrowhead
    p = c.beginPath()
    p.moveTo(x2, y)
    p.lineTo(x2 - 6, y + 3)
    p.lineTo(x2 - 6, y - 3)
    p.close()
    c.drawPath(p, fill=1, stroke=0)
    if label:
        c.setFillColor(C_GREY_TEXT)
        c.setFont("Helvetica", 7)
        c.drawCentredString((x1 + x2) / 2, y + 3, label)
    c.restoreState()


def arrow_down(c, x, y1, y2, color=C_GREY_LINE, label=None):
    c.saveState()
    c.setStrokeColor(color)
    c.setFillColor(color)
    c.setLineWidth(1.5)
    c.line(x, y1, x, y2 + 5)
    p = c.beginPath()
    p.moveTo(x, y2)
    p.lineTo(x - 3, y2 + 6)
    p.lineTo(x + 3, y2 + 6)
    p.close()
    c.drawPath(p, fill=1, stroke=0)
    if label:
        c.setFillColor(C_GREY_TEXT)
        c.setFont("Helvetica-Oblique", 7)
        c.drawCentredString(x + 14, (y1 + y2) / 2, label)
    c.restoreState()


def section_header(c, x, y, w, title, subtitle=None, bg=C_NAVY, num=None):
    h = 24
    c.saveState()
    c.setFillColor(bg)
    c.roundRect(x, y, w, h, 4, fill=1, stroke=0)
    # number badge
    xoff = x + 8
    if num:
        c.setFillColor(C_WHITE)
        c.circle(xoff + 7, y + h / 2, 7, fill=1, stroke=0)
        c.setFillColor(bg)
        c.setFont("Helvetica-Bold", 8)
        c.drawCentredString(xoff + 7, y + h / 2 - 3, str(num))
        xoff += 20
    c.setFillColor(C_WHITE)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(xoff, y + h / 2 - 3.5, title)
    if subtitle:
        c.setFont("Helvetica", 8)
        c.setFillColor(colors.HexColor("#94A3B8"))
        c.drawString(xoff + c.stringWidth(title, "Helvetica-Bold", 10) + 8,
                     y + h / 2 - 3.5, subtitle)
    c.restoreState()
    return h


def field_pill(c, x, y, text, bg, fg=C_WHITE, w=None, font_size=7.5):
    c.saveState()
    text_w = c.stringWidth(text, "Helvetica", font_size)
    pill_w = (w if w else text_w + 12)
    pill_h = 13
    c.setFillColor(bg)
    c.roundRect(x, y, pill_w, pill_h, 5, fill=1, stroke=0)
    c.setFillColor(fg)
    c.setFont("Helvetica", font_size)
    c.drawCentredString(x + pill_w / 2, y + 3.5, text)
    c.restoreState()
    return pill_w


# ─────────────────────────────────────────────
# SECTION 1 — LICENSE HIERARCHY
# ─────────────────────────────────────────────
def draw_license_hierarchy(c, W, H):
    pad = 12
    # background
    c.setFillColor(C_GREY_BG)
    c.roundRect(0, 0, W, H, 6, fill=1, stroke=0)

    sy = H - pad - 24
    section_header(c, pad, sy, W - 2 * pad, "LICENSE HIERARCHY",
                   subtitle="ess.license  →  ess.server  →  res.company",
                   bg=C_BLUE, num=1)
    sy -= 10

    # ── Node dimensions
    nw, nh = 170, 52

    # ── Row 1: ess.license
    x1 = (W - nw) / 2
    y1 = sy - nh - 4
    rounded_box(c, x1, y1, nw, nh, C_LIGHT_BLUE, C_BLUE, radius=6,
                label=None)
    c.setFillColor(C_BLUE)
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(x1 + nw / 2, y1 + nh - 14, "ess.license")
    # fields
    fx = x1 + 8
    fy = y1 + 6
    for tag, bg in [("License Key", C_BLUE), ("Tier", C_TEAL), ("Expiry", C_ORANGE)]:
        fw = field_pill(c, fx, fy, tag, bg, w=None)
        fx += fw + 4

    # ── Arrow down
    arrow_down(c, W / 2, y1, y1 - 18, color=C_BLUE, label="many2many")
    y2 = y1 - 18 - nh - 4

    # ── Row 2: ess.server
    nw2 = 185
    x2 = (W - nw2) / 2
    rounded_box(c, x2, y2, nw2, nh, C_LIGHT_TEAL, C_TEAL, radius=6)
    c.setFillColor(C_TEAL)
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(x2 + nw2 / 2, y2 + nh - 14, "ess.server")
    fx = x2 + 8
    fy = y2 + 6
    for tag, bg in [("Name", C_TEAL), ("URL", C_BLUE)]:
        fw = field_pill(c, fx, fy, tag, bg, w=None)
        fx += fw + 4

    # ── Arrow down
    arrow_down(c, W / 2, y2, y2 - 18, color=C_TEAL, label="many2many")
    y3 = y2 - 18 - nh - 4

    # ── Row 3: res.company
    nw3 = 190
    x3 = (W - nw3) / 2
    rounded_box(c, x3, y3, nw3, nh, C_LIGHT_PUR, C_PURPLE, radius=6)
    c.setFillColor(C_PURPLE)
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(x3 + nw3 / 2, y3 + nh - 14, "res.company")
    fx = x3 + 8
    fy = y3 + 6
    for tag, bg in [("Company Name", C_PURPLE), ("Logo", C_BLUE)]:
        fw = field_pill(c, fx, fy, tag, bg, w=None)
        fx += fw + 4

    # Note at bottom
    c.setFillColor(C_GREY_TEXT)
    c.setFont("Helvetica-Oblique", 7.5)
    c.drawCentredString(W / 2, pad + 2,
                        "One license key may authorize multiple servers; each server may serve multiple companies.")


# ─────────────────────────────────────────────
# SECTION 2 — CREDENTIAL HIERARCHY
# ─────────────────────────────────────────────
def draw_credential_hierarchy(c, W, H):
    pad = 12
    c.setFillColor(C_GREY_BG)
    c.roundRect(0, 0, W, H, 6, fill=1, stroke=0)

    sy = H - pad - 24
    section_header(c, pad, sy, W - 2 * pad, "CREDENTIAL HIERARCHY",
                   subtitle="hr.employee  →  ess.employee.credential",
                   bg=C_TEAL, num=2)
    sy -= 14

    # hr.employee box
    ew, eh = 155, 34
    ex = pad + 10
    ey = sy - eh
    rounded_box(c, ex, ey, ew, eh, C_LIGHT_TEAL, C_TEAL, radius=5)
    c.setFillColor(C_TEAL)
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(ex + ew / 2, ey + eh / 2 - 3.5, "hr.employee")

    # Arrow right
    ax1 = ex + ew + 4
    ay = ey + eh / 2
    ax2 = ax1 + 38
    arrow_right(c, ax1, ay, ax2, color=C_TEAL, label="one2one")

    # Credential box
    cw, ch = W - ax2 - pad - 10, 110
    cx = ax2
    cy = ey + eh / 2 - ch / 2 - 4
    rounded_box(c, cx, cy, cw, ch, C_LIGHT_ORG, C_ORANGE, radius=5)
    c.setFillColor(C_ORANGE)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(cx + 10, cy + ch - 17, "ess.employee.credential")

    # Branch line + fields
    lx = cx + 18
    fields = [
        ("badge_id", "Badge+PIN login", C_BLUE),
        ("username", "Username+Password login", C_TEAL),
        ("pin_hash", "SHA-256", C_PURPLE),
        ("password_hash", "SHA-256", C_PURPLE),
    ]
    fy_top = cy + ch - 34
    fy_bottom = cy + 14
    step = (fy_top - fy_bottom) / max(len(fields) - 1, 1)

    # vertical branch line
    c.setStrokeColor(C_ORANGE)
    c.setLineWidth(1.5)
    c.line(lx, fy_top, lx, fy_bottom)

    for i, (fname, fdesc, fclr) in enumerate(fields):
        fy = fy_top - i * step
        # horizontal tick
        c.setStrokeColor(C_ORANGE)
        c.line(lx, fy, lx + 14, fy)
        # field name pill
        fw = field_pill(c, lx + 16, fy - 7, fname, fclr, w=80)
        # description
        c.setFillColor(C_GREY_TEXT)
        c.setFont("Helvetica-Oblique", 7.5)
        c.drawString(lx + 16 + fw + 5, fy - 3, fdesc)

    # note at bottom
    c.setFillColor(C_GREY_TEXT)
    c.setFont("Helvetica-Oblique", 7.5)
    c.drawCentredString(W / 2, pad + 2,
                        "Each employee has exactly one credential record. Passwords/PINs stored as SHA-256 hashes.")


# ─────────────────────────────────────────────
# SECTION 3 — AUTH FLOW
# ─────────────────────────────────────────────
def draw_auth_flow(c, W, H):
    pad = 10
    c.setFillColor(C_GREY_BG)
    c.roundRect(0, 0, W, H, 6, fill=1, stroke=0)

    sy = H - pad - 24
    section_header(c, pad, sy, W - 2 * pad, "AUTH FLOW — Client to Server",
                   subtitle="3 steps: Activate → Select Company → Login",
                   bg=C_PURPLE, num=3)
    sy -= 10

    col_w = (W - 2 * pad - 8) / 3
    cols = [pad + i * (col_w + 4) for i in range(3)]
    box_h = sy - pad - 4
    step_titles = [
        ("Step 1", "License Activation", C_BLUE),
        ("Step 2", "Company Selection", C_TEAL),
        ("Step 3", "Login (two modes)", C_PURPLE),
    ]

    for i, (snum, stitle, scolor) in enumerate(step_titles):
        bx = cols[i]
        by = pad
        bw = col_w
        bh = box_h

        # outer box
        c.setFillColor(C_WHITE)
        c.setStrokeColor(scolor)
        c.setLineWidth(1.5)
        c.roundRect(bx, by, bw, bh, 5, fill=1, stroke=1)

        # title bar
        c.setFillColor(scolor)
        c.roundRect(bx, by + bh - 22, bw, 22, 5, fill=1, stroke=0)
        c.setFillColor(C_WHITE)
        c.setFont("Helvetica-Bold", 8.5)
        c.drawCentredString(bx + bw / 2, by + bh - 14, f"{snum} — {stitle}")

        iy = by + bh - 34  # inner y cursor

        if i == 0:
            # Step 1
            items = [
                ("Mobile App", C_LIGHT_BLUE, C_BLUE),
                ("POST /ess/api/auth/validate-license", None, None),
                ("{ license_key, server_url }", None, None),
                ("Check: license active?", C_LIGHT_YEL, C_YELLOW),
                ("Check: server authorized?", C_LIGHT_YEL, C_YELLOW),
                ("Returns: companies[]", C_LIGHT_GRN, C_GREEN),
            ]
            for text, bg, fg in items:
                if bg:
                    rounded_box(c, bx + 8, iy - 14, bw - 16, 16, bg, fg or bg,
                                radius=3, label=None)
                    c.setFillColor(fg or C_BLACK)
                    c.setFont("Helvetica-Bold", 7.5)
                    c.drawCentredString(bx + bw / 2, iy - 6.5, text)
                else:
                    c.setFillColor(C_GREY_TEXT)
                    c.setFont("Helvetica", 7)
                    c.drawCentredString(bx + bw / 2, iy - 6, text)
                iy -= 20
                if text.startswith("POST"):
                    arrow_down(c, bx + bw / 2, iy + 16, iy + 4, color=C_BLUE)
                elif text.startswith("{"):
                    iy -= 2

        elif i == 1:
            # Step 2
            c.setFillColor(C_GREY_TEXT)
            c.setFont("Helvetica", 8)
            c.drawCentredString(bx + bw / 2, iy - 6, "User selects from")
            iy -= 18
            rounded_box(c, bx + 10, iy - 18, bw - 20, 20, C_LIGHT_PUR, C_PURPLE,
                        radius=5, label="companies[]", label_color=C_PURPLE,
                        font="Helvetica-Bold", font_size=9)
            iy -= 28
            c.setFillColor(C_GREY_TEXT)
            c.setFont("Helvetica", 7.5)
            c.drawCentredString(bx + bw / 2, iy - 4,
                                "returned by Step 1")
            iy -= 22
            arrow_down(c, bx + bw / 2, iy + 14, iy, color=C_PURPLE)
            iy -= 14
            rounded_box(c, bx + 10, iy - 18, bw - 20, 20, C_LIGHT_TEAL, C_TEAL,
                        radius=5, label="company_id selected", label_color=C_TEAL,
                        font="Helvetica", font_size=8)
            iy -= 30
            c.setFillColor(C_GREY_TEXT)
            c.setFont("Helvetica-Oblique", 7)
            c.drawCentredString(bx + bw / 2, iy,
                                "Passed to Step 3 login request")

        else:
            # Step 3: two modes side by side inside the column
            mode_w = (bw - 22) / 2
            mx_a = bx + 6
            mx_b = bx + 12 + mode_w
            my_top = iy - 4

            for mx, mtitle, mcolor, mfields, mchecksteps in [
                (mx_a, "Mode A: Badge+PIN", C_BLUE,
                 ["{", "  badge_id,", "  pin,", "  company_id", "}"],
                 ["find by badge_id", "verify pin_hash", "→ {user, tokens}"]),
                (mx_b, "Mode B: User+Pass", C_TEAL,
                 ["{", "  username,", "  password,", "  company_id", "}"],
                 ["resolve username", "verify pwd_hash", "→ {user, tokens}"]),
            ]:
                # mode header
                c.setFillColor(mcolor)
                c.roundRect(mx, my_top - 14, mode_w, 14, 3, fill=1, stroke=0)
                c.setFillColor(C_WHITE)
                c.setFont("Helvetica-Bold", 6.5)
                c.drawCentredString(mx + mode_w / 2, my_top - 8.5, mtitle)

                # endpoint
                c.setFillColor(C_GREY_TEXT)
                c.setFont("Helvetica", 6)
                c.drawCentredString(mx + mode_w / 2, my_top - 24,
                                    "POST .../auth/login")

                # body box
                body_h = len(mfields) * 9 + 4
                c.setFillColor(C_GREY_BG)
                c.setStrokeColor(C_GREY_LINE)
                c.setLineWidth(0.5)
                c.roundRect(mx + 2, my_top - 24 - body_h - 8, mode_w - 4, body_h + 2,
                            2, fill=1, stroke=1)
                for j, fl in enumerate(mfields):
                    c.setFillColor(C_BLACK)
                    c.setFont("Courier", 6)
                    c.drawString(mx + 5, my_top - 32 - body_h + (len(mfields) - j) * 9, fl)

                # check steps
                step_y = my_top - 24 - body_h - 16
                arrow_down(c, mx + mode_w / 2, step_y + 8, step_y, color=mcolor)
                step_y -= 4
                for step_txt in mchecksteps:
                    sc = C_LIGHT_GRN if step_txt.startswith("→") else (
                        colors.HexColor("#EFF6FF") if mcolor == C_BLUE else C_LIGHT_TEAL)
                    sc2 = C_GREEN if step_txt.startswith("→") else mcolor
                    step_h = 11
                    c.setFillColor(sc)
                    c.roundRect(mx + 2, step_y - step_h, mode_w - 4, step_h, 2, fill=1, stroke=0)
                    c.setFillColor(sc2)
                    c.setFont("Helvetica", 6)
                    c.drawCentredString(mx + mode_w / 2, step_y - 7.5, step_txt)
                    step_y -= step_h + 2
                    if step_txt != mchecksteps[-1]:
                        arrow_down(c, mx + mode_w / 2, step_y + 2, step_y - 4, color=mcolor)
                        step_y -= 6

            # divider
            mid_x = bx + bw / 2
            c.setStrokeColor(C_GREY_LINE)
            c.setLineWidth(0.8)
            c.setDash(3, 3)
            c.line(mid_x, by + 4, mid_x, iy - 2)
            c.setDash()


# ─────────────────────────────────────────────
# SECTION 4 — USERNAME RESOLUTION
# ─────────────────────────────────────────────
def draw_username_resolution(c, W, H):
    pad = 10
    c.setFillColor(C_GREY_BG)
    c.roundRect(0, 0, W, H, 6, fill=1, stroke=0)

    sy = H - pad - 24
    section_header(c, pad, sy, W - 2 * pad, "USERNAME RESOLUTION ORDER",
                   subtitle="checked in this priority",
                   bg=C_ORANGE, num=4)
    sy -= 14

    items = [
        ("1", "ess.employee.credential.username", "Primary identifier for login", C_BLUE, C_LIGHT_BLUE),
        ("2", "ess.employee.credential.badge_id", "Fallback: badge as username", C_TEAL, C_LIGHT_TEAL),
        ("3", "hr.employee.work_email", "Last resort: Odoo work email", C_PURPLE, C_LIGHT_PUR),
    ]

    iw = (W - 2 * pad - 8) / len(items)
    for i, (num, title, desc, fg, bg) in enumerate(items):
        ix = pad + i * (iw + 4)
        iy = pad
        ih = sy - pad

        c.setFillColor(bg)
        c.setStrokeColor(fg)
        c.setLineWidth(1.2)
        c.roundRect(ix, iy, iw, ih, 5, fill=1, stroke=1)

        # number circle
        c.setFillColor(fg)
        c.circle(ix + iw / 2, iy + ih - 16, 10, fill=1, stroke=0)
        c.setFillColor(C_WHITE)
        c.setFont("Helvetica-Bold", 10)
        c.drawCentredString(ix + iw / 2, iy + ih - 20, num)

        c.setFillColor(fg)
        c.setFont("Helvetica-Bold", 8)
        # wrap long title
        words = title.split(".")
        if len(words) > 2:
            line1 = ".".join(words[:2])
            line2 = "." + ".".join(words[2:])
            c.drawCentredString(ix + iw / 2, iy + ih - 38, line1)
            c.drawCentredString(ix + iw / 2, iy + ih - 50, line2)
        else:
            c.drawCentredString(ix + iw / 2, iy + ih - 44, title)

        c.setFillColor(C_GREY_TEXT)
        c.setFont("Helvetica", 7.5)
        c.drawCentredString(ix + iw / 2, iy + 14, desc)

        # arrow between boxes
        if i < len(items) - 1:
            ax = ix + iw + 2
            ay = iy + ih / 2
            arrow_right(c, ax - 2, ay, ax + 6, color=C_GREY_LINE, label="fallback")


# ─────────────────────────────────────────────
# SECTION 5 — API RESPONSE ENVELOPE
# ─────────────────────────────────────────────
def draw_api_response(c, W, H):
    pad = 10
    c.setFillColor(C_GREY_BG)
    c.roundRect(0, 0, W, H, 6, fill=1, stroke=0)

    sy = H - pad - 24
    section_header(c, pad, sy, W - 2 * pad, "API RESPONSE ENVELOPE",
                   subtitle="standard success / error wrapper",
                   bg=C_GREEN, num=5)
    sy -= 12

    half = (W - 2 * pad - 6) / 2

    # Success
    sx = pad
    c.setFillColor(C_LIGHT_GRN)
    c.setStrokeColor(C_GREEN)
    c.setLineWidth(1.2)
    c.roundRect(sx, pad, half, sy - pad, 5, fill=1, stroke=1)
    c.setFillColor(C_GREEN)
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(sx + half / 2, sy - 10, "SUCCESS")

    lines_ok = [
        '{',
        '  "success": true,',
        '  "data": {',
        '    ...payload...',
        '  }',
        '}',
    ]
    ly = sy - 24
    for ln in lines_ok:
        c.setFillColor(C_BLACK)
        c.setFont("Courier", 8)
        c.drawString(sx + 12, ly, ln)
        ly -= 12

    # Error
    ex = pad + half + 6
    c.setFillColor(C_LIGHT_RED)
    c.setStrokeColor(C_RED)
    c.setLineWidth(1.2)
    c.roundRect(ex, pad, half, sy - pad, 5, fill=1, stroke=1)
    c.setFillColor(C_RED)
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(ex + half / 2, sy - 10, "ERROR")

    lines_err = [
        '{',
        '  "success": false,',
        '  "error": {',
        '    "code": "AUTH_FAILED",',
        '    "message": "...",',
        '    "message_ar": "..."',
        '  }',
        '}',
    ]
    ly = sy - 24
    for ln in lines_err:
        c.setFillColor(C_BLACK)
        c.setFont("Courier", 8)
        c.drawString(ex + 12, ly, ln)
        ly -= 12


# ─────────────────────────────────────────────
# SECTION 6 — BACKEND MODES
# ─────────────────────────────────────────────
def draw_backend_modes(c, W, H):
    pad = 10
    c.setFillColor(C_GREY_BG)
    c.roundRect(0, 0, W, H, 6, fill=1, stroke=0)

    sy = H - pad - 24
    section_header(c, pad, sy, W - 2 * pad, "BACKEND MODES",
                   subtitle="ACTIVE_BACKEND = 'mock' | 'odoo' | 'django'",
                   bg=C_NAVY, num=6)
    sy -= 10

    modes = [
        ("mock", "Local Mock Data", "Dev & testing only. No network calls. Returns hardcoded fixtures.", C_YELLOW, C_LIGHT_YEL),
        ("odoo", "Direct Odoo JSON-RPC", "Production default. Communicates directly with Odoo backend via JSON-RPC.", C_BLUE, C_LIGHT_BLUE),
        ("django", "Django Middleware", "Future integration. Django acts as intermediary API layer between app and Odoo.", C_PURPLE, C_LIGHT_PUR),
    ]

    mw = (W - 2 * pad - 2 * 6) / len(modes)
    for i, (key, title, desc, fg, bg) in enumerate(modes):
        mx = pad + i * (mw + 6)
        my = pad
        mh = sy - pad

        c.setFillColor(bg)
        c.setStrokeColor(fg)
        c.setLineWidth(1.5)
        c.roundRect(mx, my, mw, mh, 5, fill=1, stroke=1)

        # mode key badge
        kw = c.stringWidth(f"'{key}'", "Courier-Bold", 11) + 14
        kx = mx + (mw - kw) / 2
        c.setFillColor(fg)
        c.roundRect(kx, my + mh - 28, kw, 18, 4, fill=1, stroke=0)
        c.setFillColor(C_WHITE)
        c.setFont("Courier-Bold", 11)
        c.drawCentredString(mx + mw / 2, my + mh - 21, f"'{key}'")

        # title
        c.setFillColor(fg)
        c.setFont("Helvetica-Bold", 8.5)
        c.drawCentredString(mx + mw / 2, my + mh - 44, title)

        # description wrapped manually
        c.setFillColor(C_GREY_TEXT)
        c.setFont("Helvetica", 7.5)
        words = desc.split()
        line = ""
        ly = my + mh - 58
        for word in words:
            test = (line + " " + word).strip()
            if c.stringWidth(test, "Helvetica", 7.5) > mw - 16:
                c.drawCentredString(mx + mw / 2, ly, line)
                ly -= 11
                line = word
            else:
                line = test
        if line:
            c.drawCentredString(mx + mw / 2, ly, line)

        # status pill at bottom
        status_map = {"mock": ("DEV/TEST", C_YELLOW), "odoo": ("ACTIVE", C_GREEN), "django": ("FUTURE", C_GREY_TEXT)}
        slabel, scolor = status_map[key]
        sw = 50
        c.setFillColor(scolor)
        c.roundRect(mx + (mw - sw) / 2, my + 8, sw, 14, 4, fill=1, stroke=0)
        c.setFillColor(C_WHITE)
        c.setFont("Helvetica-Bold", 7)
        c.drawCentredString(mx + mw / 2, my + 13, slabel)


# ─────────────────────────────────────────────
# TITLE PAGE HEADER
# ─────────────────────────────────────────────
def draw_title_header(c, x, y, w, h):
    # gradient-like background (two overlapping rects)
    c.setFillColor(C_NAVY)
    c.roundRect(x, y, w, h, 6, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#1E3A6E"))
    c.roundRect(x + w * 0.5, y, w * 0.52, h, 6, fill=1, stroke=0)

    # accent stripe
    c.setFillColor(C_BLUE)
    c.rect(x, y, 6, h, fill=1, stroke=0)

    # title
    c.setFillColor(C_WHITE)
    c.setFont("Helvetica-Bold", 18)
    c.drawString(x + 18, y + h - 28, "ESS HR Mobile — System Architecture")

    # subtitle
    c.setFillColor(colors.HexColor("#94A3B8"))
    c.setFont("Helvetica", 9)
    c.drawString(x + 18, y + h - 44,
                 "License Hierarchy  •  Credential Model  •  Auth Flow  •  "
                 "Username Resolution  •  API Envelope  •  Backend Modes")

    # date badge
    from datetime import date
    today = date.today().strftime("%B %d, %Y")
    bw = 110
    c.setFillColor(C_BLUE)
    c.roundRect(x + w - bw - 14, y + h / 2 - 9, bw, 18, 4, fill=1, stroke=0)
    c.setFillColor(C_WHITE)
    c.setFont("Helvetica", 8)
    c.drawCentredString(x + w - bw / 2 - 14, y + h / 2 - 1, today)

    # version tag
    c.setFillColor(C_TEAL)
    c.roundRect(x + w - bw - 14, y + h / 2 - 30, 48, 14, 3, fill=1, stroke=0)
    c.setFillColor(C_WHITE)
    c.setFont("Helvetica-Bold", 7)
    c.drawCentredString(x + w - bw + 10, y + h / 2 - 23, "v1.0")


# ─────────────────────────────────────────────
# MAIN PAGE BUILDER
# ─────────────────────────────────────────────
def build_pdf():
    def draw_all(canvas, doc_obj):
        W = PAGE_W
        H = PAGE_H
        m = MARGIN

        canvas.saveState()

        # overall background
        canvas.setFillColor(colors.HexColor("#EEF2F7"))
        canvas.rect(0, 0, W, H, fill=1, stroke=0)

        # Title Header
        th = 52
        ty = H - m - th
        draw_title_header(canvas, m, ty, W - 2 * m, th)

        # Layout grid: 3 columns top row, 3 cols bottom row
        gutter = 8
        col_count = 3
        cw = (W - 2 * m - (col_count - 1) * gutter) / col_count

        row_top_y = ty - gutter
        top_row_h = (row_top_y - m - gutter) * 0.53
        bot_row_h = row_top_y - m - gutter - top_row_h - gutter

        for i in range(col_count):
            cx = m + i * (cw + gutter)

            # Top row
            ty_row = row_top_y - top_row_h
            canvas.saveState()
            canvas.translate(cx, ty_row)
            if i == 0:
                draw_license_hierarchy(canvas, cw, top_row_h)
            elif i == 1:
                draw_credential_hierarchy(canvas, cw, top_row_h)
            else:
                draw_auth_flow(canvas, cw, top_row_h)
            canvas.restoreState()

            # Bottom row
            by_row = m
            canvas.saveState()
            canvas.translate(cx, by_row)
            if i == 0:
                draw_username_resolution(canvas, cw, bot_row_h)
            elif i == 1:
                draw_api_response(canvas, cw, bot_row_h)
            else:
                draw_backend_modes(canvas, cw, bot_row_h)
            canvas.restoreState()

        # footer
        canvas.setFillColor(C_GREY_TEXT)
        canvas.setFont("Helvetica", 7)
        canvas.drawCentredString(W / 2, m / 2 + 2,
            "ESS HR Mobile App — Confidential Architecture Document  |  "
            "Generated by generate_pdf.py")

        canvas.restoreState()

    from reportlab.platypus.flowables import Flowable as _Flowable

    class BlankPage(_Flowable):
        def __init__(self):
            super().__init__()
            self.width = 0
            self.height = 0

        def draw(self):
            pass

    from reportlab.platypus import SimpleDocTemplate as _SDT
    _doc = _SDT(
        OUTPUT_FILE,
        pagesize=landscape(A4),
        leftMargin=0,
        rightMargin=0,
        topMargin=0,
        bottomMargin=0,
    )
    _doc.build([BlankPage()],
               onFirstPage=draw_all,
               onLaterPages=draw_all)

    print(f"PDF generated: {OUTPUT_FILE}")


if __name__ == "__main__":
    build_pdf()
