"""Generateur d'icones de Diez.

EXECUTE A LA MAIN, UNE FOIS. Ne fait pas partie du build et n'ajoute aucune
dependance au projet : Pillow est un outil local, pas une dependance de Diez.

    python tools/icones.py

Exception assumee a la convention « tools/ contient des scripts Node » :
aucune bibliotheque d'image Node n'est installee. Voir docs/conventions-code.md.

Toutes les constantes ci-dessous viennent de docs/spec-fondations.md, section
« Les icones ». Ne pas les modifier ici sans modifier la specification.
"""

from pathlib import Path

from PIL import Image, ImageDraw

RACINE = Path(__file__).resolve().parent.parent
SORTIE = RACINE / "public"

# Le « d » bas-de-casse en matrice de 5 colonnes sur 7 rangees, 16 points
# allumes sur 35. Coordonnees (colonne, rangee).
MOTIF = [
    (4, 0),
    (4, 1),
    (1, 2), (2, 2), (3, 2), (4, 2),
    (0, 3), (4, 3),
    (0, 4), (4, 4),
    (0, 5), (4, 5),
    (1, 6), (2, 6), (3, 6), (4, 6),
]

TOILE = 512
FOND = (0, 0, 0)
POINT = (255, 255, 255)

# Facteur de suréchantillonnage : ImageDraw ne lisse pas les bords, on dessine
# en grand puis on reduit en Lanczos.
SUR = 4

# ATTENTION : les decalages ci-dessous integrent la CORRECTION OPTIQUE et ne
# sont PAS le centrage geometrique. Un bas-de-casse ne remplit pas sa boite de
# facon symetrique : le centre de gravite des points tombe a (2,500 ; 3,562)
# quand celui de la boite est a (2,0 ; 3,0), soit une demi-cellule a droite et
# 0,5625 cellule en bas. Centrer sur la boite ferait flotter le glyphe.
VARIANTES = {
    # nom            cellule  diametre  decalage x  decalage y
    "any": dict(cellule=58, diametre=44, dx=82, dy=20),
    "maskable": dict(cellule=46, diametre=35, dx=118, dy=69),
}


def centres(v):
    """Centres des points, en coordonnees de toile."""
    c = v["cellule"]
    return [(v["dx"] + c * col + c / 2, v["dy"] + c * rang + c / 2) for col, rang in MOTIF]


def dessiner(v, taille):
    """Rend une icone carree de `taille` pixels, bords lisses."""
    grand = TOILE * SUR
    img = Image.new("RGB", (grand, grand), FOND)
    d = ImageDraw.Draw(img)
    r = v["diametre"] / 2 * SUR
    for x, y in centres(v):
        cx, cy = x * SUR, y * SUR
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=POINT)
    return img.resize((taille, taille), Image.LANCZOS)


def svg(v):
    """Le meme glyphe en SVG : source inspectable, sans rasterisation."""
    cercles = "".join(
        '<circle cx="%g" cy="%g" r="%g" fill="#FFFFFF"/>' % (x, y, v["diametre"] / 2)
        for x, y in centres(v)
    )
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" '
        'width="%d" height="%d" role="img">'
        "<title>Diez</title>"
        '<rect width="%d" height="%d" fill="#000000"/>%s</svg>\n'
        % (TOILE, TOILE, TOILE, TOILE, TOILE, TOILE, cercles)
    )


def main():
    SORTIE.mkdir(exist_ok=True)
    a, m = VARIANTES["any"], VARIANTES["maskable"]

    fichiers = [
        ("icone-512.png", dessiner(a, 512)),
        ("icone-192.png", dessiner(a, 192)),
        ("icone-512-maskable.png", dessiner(m, 512)),
        # iOS ignore les icones du manifest pour l'ecran d'accueil : sans
        # celle-ci, un iPhone y affiche une capture de la page.
        ("apple-touch-icon.png", dessiner(a, 180)),
    ]
    for nom, img in fichiers:
        img.save(SORTIE / nom, optimize=True)
        print("  %-24s %5.1f Ko" % (nom, (SORTIE / nom).stat().st_size / 1024))

    (SORTIE / "icone.svg").write_text(svg(a), encoding="utf-8")
    print("  %-24s %5.1f Ko" % ("icone.svg", (SORTIE / "icone.svg").stat().st_size / 1024))

    # Controle de la zone de securite maskable : cercle de 80 % du cote.
    limite = TOILE * 0.8 / 2
    loin = max(
        ((x - TOILE / 2) ** 2 + (y - TOILE / 2) ** 2) ** 0.5 + m["diametre"] / 2
        for x, y in centres(m)
    )
    etat = "dans la zone" if loin <= limite else "DEPASSE"
    print("\n  maskable : point le plus loin %.1f, limite %.1f, %s" % (loin, limite, etat))


if __name__ == "__main__":
    main()
