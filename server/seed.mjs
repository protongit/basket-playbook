function offense(slot, x, y, hasBall = false) {
  return { id: `o${slot}`, team: "offense", slot: String(slot), x, y, hasBall };
}

function defense(slot, x, y) {
  return { id: `d${slot}`, team: "defense", slot: `X${slot}`, x, y, hasBall: false };
}

function frame(label, note, players, actions = [], durationMs = 900) {
  return {
    id: `f-${Math.random().toString(36).slice(2, 10)}`,
    label,
    note,
    durationMs,
    players,
    actions,
    strokes: [],
  };
}

function action(playerId, type, targetId) {
  return targetId ? { playerId, type, targetId } : { playerId, type };
}

export function buildDemoPlaybook() {
  const player = (slot, x, y, ball = false) => offense(slot, x, y, ball);

  const horns = {
    title: "Horns PnR",
    callCode: "HORNS 45",
    category: "Ataque",
    subcategory: "Bloqueo directo",
    chapterId: "ataque",
    court: { type: "half", league: "fiba" },
    meta: {
      objective: "Generar ventaja con bloqueo directo desde Horns y atacar la caída del bloqueador.",
      keyPersonnel: "Base con lectura de bloqueo, pívot móvil y tiradores en las esquinas.",
      reads: [
        "Si la defensa pasa por debajo, el base ataca la caída.",
        "Si el pívot defensor ayuda, el bloqueador cae al aro.",
        "Si la esquina ayuda, pase extra al tirador.",
      ],
      counters: ["Rechazo del base", "Slip del bloqueador", "Inversión y bloqueo indirecto"],
      coachingPoints: [
        "El bloqueo debe ser legal y orientado hacia la banda.",
        "El base espera la caída antes de decidir.",
        "El pívot abre el cuerpo al recibir.",
      ],
      tags: ["horns", "pick and roll", "ataque"],
    },
    frames: [
      frame(
        "Formación Horns",
        "1 con balón en la cabecera. 4 y 5 en los codos. 2 y 3 abren el campo.",
        [
          player(1, 0.5, 0.62, true),
          player(2, 0.16, 0.4),
          player(3, 0.84, 0.4),
          player(4, 0.35, 0.36),
          player(5, 0.65, 0.36),
        ],
      ),
      frame(
        "Bloqueo y bote",
        "4 sube a bloquear a la defensa de 1. 1 bota hacia la banda.",
        [
          player(1, 0.62, 0.52, true),
          player(2, 0.16, 0.4),
          player(3, 0.84, 0.4),
          player(4, 0.45, 0.54),
          player(5, 0.72, 0.34),
        ],
        [action("o4", "screen"), action("o1", "dribble")],
      ),
      frame(
        "Caída y pase",
        "4 cae al aro. 1 encuentra la ventana de pase.",
        [
          player(1, 0.62, 0.52),
          player(2, 0.14, 0.38),
          player(3, 0.86, 0.38),
          player(4, 0.55, 0.16, true),
          player(5, 0.78, 0.33),
        ],
        [action("o1", "pass", "o4"), action("o4", "roll")],
      ),
      frame(
        "Finalización",
        "4 recibe en ventaja y finaliza. 5 ocupa el rebote ofensivo.",
        [
          player(1, 0.64, 0.5),
          player(2, 0.12, 0.36),
          player(3, 0.88, 0.36),
          player(4, 0.5, 0.08, true),
          player(5, 0.7, 0.22),
        ],
        [action("o4", "shot")],
        700,
      ),
    ],
  };

  const blob = {
    title: "Box BLOB",
    callCode: "BOX 1",
    category: "Balones fuera",
    subcategory: "BLOB",
    chapterId: "balones",
    court: { type: "half", league: "fiba" },
    meta: {
      objective: "Saque de fondo desde caja para liberar un tiro en la esquina.",
      keyPersonnel: "Inbounder con buena lectura, tirador en la esquina y bloqueadores interiores.",
      reads: [
        "Si la defensa sobrepasa el bloqueo, cortar por línea de fondo.",
        "Si el bloqueo se cambia, el bloqueador se abre al tiro.",
      ],
      counters: ["Bloqueo ciego", "Puerta atrás", "Saque directo al poste"],
      coachingPoints: ["Saque rápido y seguro.", "Ocupar la esquina antes de cortar.", "Rebote ofensivo tras el tiro."],
      tags: ["blob", "box", "balón fuera"],
    },
    frames: [
      frame(
        "Caja inicial",
        "1 saca desde el fondo. 4 y 5 en la caja alta. 2 y 3 en las esquinas.",
        [
          player(1, 0.88, 0.06, true),
          player(2, 0.16, 0.18),
          player(3, 0.84, 0.18),
          player(4, 0.35, 0.36),
          player(5, 0.65, 0.36),
        ],
      ),
      frame(
        "Corte y bloqueo",
        "2 corta hacia el aro, 5 bloquea para 3 y 1 busca el pase.",
        [
          player(1, 0.88, 0.06, true),
          player(2, 0.25, 0.09),
          player(3, 0.88, 0.3),
          player(4, 0.48, 0.58),
          player(5, 0.72, 0.28),
        ],
        [action("o2", "cut"), action("o5", "screen"), action("o3", "cut")],
      ),
      frame(
        "Tiro de esquina",
        "3 recibe en la esquina y finaliza. 2 y 4 van al rebote.",
        [
          player(1, 0.86, 0.06),
          player(2, 0.38, 0.1),
          player(3, 0.94, 0.12, true),
          player(4, 0.5, 0.24),
          player(5, 0.68, 0.18),
        ],
        [action("o1", "pass", "o3"), action("o3", "shot")],
        700,
      ),
    ],
  };

  const zone = {
    title: "2-3 Zone: desplazamiento",
    callCode: "ZONE 23",
    category: "Defensa",
    subcategory: "Zona",
    chapterId: "defensa",
    court: { type: "half", league: "fiba" },
    meta: {
      objective: "Explicar los desplazamientos base de la zona 2-3 y la cobertura del lado del balón.",
      keyPersonnel: "Defensores exteriores con movilidad y dos interiores que protegen el aro.",
      reads: ["El ala del lado débil sube al carril de pase.", "El poste bajo defiende el corte por línea de fondo."],
      counters: ["Ajuste a 1-3-1", "Trampa en la esquina", "Cambio a individual"],
      coachingPoints: ["Manos activas y comunicación constante.", "Proteger el poste bajo.", "Cerrar el rebote desde el lado débil."],
      tags: ["zona", "2-3", "defensa"],
    },
    frames: [
      frame(
        "Zona 2-3 inicial",
        "Dos defensores arriba, tres abajo. 1 con balón en la cabecera.",
        [
          player(1, 0.5, 0.62, true),
          player(2, 0.18, 0.4),
          player(3, 0.82, 0.4),
          player(4, 0.35, 0.28),
          player(5, 0.65, 0.28),
          defense(1, 0.5, 0.58),
          defense(2, 0.2, 0.42),
          defense(3, 0.8, 0.42),
          defense(4, 0.35, 0.18),
          defense(5, 0.65, 0.18),
        ],
      ),
      frame(
        "Balón al ala",
        "1 pasa a 2. La zona bascula: X1 sube, X3 recorta y X5 protege el poste.",
        [
          player(1, 0.5, 0.62),
          player(2, 0.16, 0.4, true),
          player(3, 0.84, 0.4),
          player(4, 0.35, 0.28),
          player(5, 0.65, 0.28),
          defense(1, 0.42, 0.55),
          defense(2, 0.1, 0.38),
          defense(3, 0.72, 0.4),
          defense(4, 0.28, 0.18),
          defense(5, 0.55, 0.2),
        ],
        [
          action("o1", "pass", "o2"),
          action("d1", "rotation"),
          action("d2", "rotation"),
          action("d3", "rotation"),
          action("d5", "rotation"),
        ],
      ),
      frame(
        "Cobertura del poste",
        "2 penetra. X4 ayuda, X5 cubre el poste bajo y X2 recupera al tirador.",
        [
          player(1, 0.52, 0.56),
          player(2, 0.25, 0.3, true),
          player(3, 0.86, 0.36),
          player(4, 0.42, 0.2),
          player(5, 0.7, 0.26),
          defense(1, 0.4, 0.48),
          defense(2, 0.22, 0.34),
          defense(3, 0.7, 0.38),
          defense(4, 0.34, 0.12),
          defense(5, 0.58, 0.14),
        ],
        [action("d1", "rotation"), action("d4", "rotation"), action("d5", "rotation")],
      ),
    ],
  };

  return {
    title: "Playbook de ejemplo",
    team: "Mi equipo",
    season: "2026",
    description:
      "Un playbook inicial para explorar la pizarra: un bloqueo directo, un saque de fondo y una zona 2-3.",
    coverColor: "#f97316",
    chapters: [
      { id: "ataque", title: "Ataque", color: "#f97316" },
      { id: "balones", title: "Balones fuera", color: "#38bdf8" },
      { id: "defensa", title: "Defensa", color: "#a3e635" },
    ],
    plays: [horns, blob, zone],
  };
}
