function offense(slot, x, y, hasBall = false) {
  return { id: `o${slot}`, team: "offense", slot: String(slot), x, y, hasBall };
}

function defense(slot, x, y) {
  return { id: `d${slot}`, team: "defense", slot: `X${slot}`, x, y, hasBall: false };
}

function action(playerId, type, targetId) {
  return targetId ? { playerId, type, targetId } : { playerId, type };
}

function frame(label, note, players, actions = [], durationMs = 900) {
  return {
    id: `cf-${Math.random().toString(36).slice(2, 10)}`,
    label,
    note,
    durationMs,
    players,
    actions,
    strokes: [],
  };
}

const meta = (objective, reads, counters, coachingPoints, tags) => ({
  objective,
  keyPersonnel: "",
  reads,
  counters,
  coachingPoints,
  tags,
});

export function buildCommonPlaybook() {
  const plays = [];

  plays.push({
    title: "Spain Pick and Roll",
    callCode: "SPAIN PNR",
    category: "Ataque",
    subcategory: "Bloqueo directo + bloqueo al bloqueador",
    chapterId: "ataque",
    court: { type: "half", league: "fiba", mode: "players" },
    meta: meta(
      "Bloqueo directo con back screen al bloqueador para castigar la cobertura drop.",
      [
        "Si el pívot defensor hunde, el bloqueador cae al aro.",
        "Si el base defensor persigue, el tirador sale libre al ala.",
        "Si cambian, atacar el desajuste interior.",
      ],
      ["Rechazo del base", "Slip del bloqueador", "Inversión y bloqueo indirecto"],
      [
        "El bloqueador debe esperar el contacto y caer con ángulo al aro.",
        "El back screen se coloca justo cuando el bloqueador empieza a caer.",
        "El base mantiene la lectura hasta el último momento.",
      ],
      ["spain pnr", "pick and roll", "horns", "euroleague"],
    ),
    frames: [
      frame(
        "Horns Spain",
        "1 con balón. 5 sube a bloquear y 2 prepara el back screen.",
        [
          offense(1, 0.5, 0.62, true),
          offense(2, 0.16, 0.4),
          offense(3, 0.84, 0.4),
          offense(4, 0.38, 0.48),
          offense(5, 0.62, 0.48),
        ],
      ),
      frame(
        "Bloqueo y back screen",
        "5 bloquea a 1; 2 golpea la espalda del defensor de 5.",
        [
          offense(1, 0.62, 0.54, true),
          offense(2, 0.68, 0.45),
          offense(3, 0.84, 0.4),
          offense(4, 0.36, 0.55),
          offense(5, 0.56, 0.55),
        ],
        [action("o5", "screen"), action("o1", "dribble"), action("o2", "screen"), action("o4", "cut")],
      ),
      frame(
        "Caída y apertura",
        "5 cae al aro y 2 se abre al ala. 1 elige pase interior o extra.",
        [
          offense(1, 0.62, 0.54),
          offense(2, 0.82, 0.42),
          offense(3, 0.9, 0.14),
          offense(4, 0.5, 0.6),
          offense(5, 0.55, 0.15, true),
        ],
        [action("o5", "roll"), action("o2", "pop"), action("o1", "pass", "o5"), action("o4", "cut")],
      ),
      frame(
        "Finalización",
        "5 recibe en ventaja y finaliza. 4 y 2 van al rebote.",
        [
          offense(1, 0.64, 0.5),
          offense(2, 0.82, 0.4),
          offense(3, 0.9, 0.14),
          offense(4, 0.45, 0.24),
          offense(5, 0.5, 0.08, true),
        ],
        [action("o5", "shot")],
        700,
      ),
    ],
  });

  plays.push({
    title: "Horns Flare",
    callCode: "HORNS FLARE",
    category: "Ataque",
    subcategory: "Bloqueo directo + flare",
    chapterId: "ataque",
    court: { type: "half", league: "fiba", mode: "players" },
    meta: meta(
      "Abrir un tiro de tres tras el bloqueo directo con un flare para el tirador.",
      [
        "Si la defensa del flare se queda corta, tiro cómodo.",
        "Si el pívot defensor ayuda, el bloqueador cae al aro.",
        "Si el ala defiende el flare por arriba, puerta atrás.",
      ],
      ["Rechazo del base", "Slip del bloqueador", "Corte por línea de fondo"],
      [
        "El flare se orienta hacia la esquina.",
        "El tirador debe venir con las manos preparadas.",
        "El bloqueador abre el cuerpo tras el bloqueo.",
      ],
      ["horns", "flare", "pick and roll", "tiro"],
    ),
    frames: [
      frame(
        "Horns inicial",
        "1 arriba, 4 y 5 en los codos, 2 y 3 en las esquinas.",
        [
          offense(1, 0.5, 0.62, true),
          offense(2, 0.08, 0.12),
          offense(3, 0.92, 0.12),
          offense(4, 0.35, 0.36),
          offense(5, 0.65, 0.36),
        ],
      ),
      frame(
        "Bloqueo y flare",
        "5 bloquea a 1; 4 abre el flare para 2 en la esquina.",
        [
          offense(1, 0.62, 0.54, true),
          offense(2, 0.18, 0.42),
          offense(3, 0.92, 0.12),
          offense(4, 0.28, 0.42),
          offense(5, 0.55, 0.55),
        ],
        [action("o5", "screen"), action("o1", "dribble"), action("o4", "screen"), action("o2", "cut")],
      ),
      frame(
        "Pase al tirador",
        "1 encuentra a 2 en el ala; 5 cae y 4 se abre.",
        [
          offense(1, 0.56, 0.5),
          offense(2, 0.16, 0.4, true),
          offense(3, 0.92, 0.12),
          offense(4, 0.22, 0.52),
          offense(5, 0.55, 0.16),
        ],
        [action("o1", "pass", "o2"), action("o5", "roll"), action("o4", "pop")],
      ),
      frame(
        "Tiro de tres",
        "2 recibe en ritmo y finaliza. 5 y 4 atacan el rebote.",
        [
          offense(1, 0.58, 0.48),
          offense(2, 0.16, 0.4, true),
          offense(3, 0.9, 0.14),
          offense(4, 0.32, 0.2),
          offense(5, 0.55, 0.14),
        ],
        [action("o2", "shot")],
        700,
      ),
    ],
  });

  plays.push({
    title: "Pistol / Zoom",
    callCode: "PISTOL 2",
    category: "Ataque",
    subcategory: "Bloqueo directo en transición",
    chapterId: "ataque",
    court: { type: "half", league: "fiba", mode: "players" },
    meta: meta(
      "Entrar rápido en bloqueo directo desde una salida Pistol con el cinco en el slot.",
      [
        "Si el defensor del bloqueo hunde, el base ataca la caída.",
        "Si el ala defiende el pase, el bloqueador cae al aro.",
        "Si la ayuda llega, pase a la esquina.",
      ],
      ["Rechazo", "Slip", "Pase extra a la esquina"],
      [
        "El pase al ala debe llegar con el bloqueo ya en camino.",
        "El cinco no debe llegar tarde al ángulo.",
        "Ocupar las esquinas antes de atacar.",
      ],
      ["pistol", "zoom", "transición", "pick and roll"],
    ),
    frames: [
      frame(
        "Salida Pistol",
        "1 bota por el centro. 5 llega al slot para bloquear.",
        [
          offense(1, 0.5, 0.62, true),
          offense(2, 0.84, 0.4),
          offense(3, 0.08, 0.12),
          offense(4, 0.32, 0.52),
          offense(5, 0.68, 0.52),
        ],
      ),
      frame(
        "Pase y bloqueo",
        "1 pasa a 2 y 5 sube a bloquear a la defensa de 2.",
        [
          offense(1, 0.92, 0.12),
          offense(2, 0.72, 0.56, true),
          offense(3, 0.08, 0.12),
          offense(4, 0.32, 0.55),
          offense(5, 0.78, 0.52),
        ],
        [action("o1", "pass", "o2"), action("o5", "screen"), action("o2", "cut")],
      ),
      frame(
        "Ataque y caída",
        "2 usa el bloqueo y ataca el codo; 5 cae al aro.",
        [
          offense(1, 0.92, 0.12),
          offense(2, 0.66, 0.58, true),
          offense(3, 0.08, 0.12),
          offense(4, 0.35, 0.55),
          offense(5, 0.62, 0.2),
        ],
        [action("o2", "dribble"), action("o5", "roll"), action("o4", "cut")],
      ),
      frame(
        "Pase interior",
        "2 encuentra a 5 en la caída y 5 finaliza.",
        [
          offense(1, 0.9, 0.12),
          offense(2, 0.64, 0.54),
          offense(3, 0.08, 0.12),
          offense(4, 0.35, 0.55),
          offense(5, 0.52, 0.08, true),
        ],
        [action("o2", "pass", "o5"), action("o5", "shot")],
        700,
      ),
    ],
  });

  plays.push({
    title: "Chicago Action",
    callCode: "CHICAGO",
    category: "Ataque",
    subcategory: "Pin down + mano a mano",
    chapterId: "ataque",
    court: { type: "half", league: "fiba", mode: "players" },
    meta: meta(
      "Encadenar pin down y mano a mano para generar una ventaja exterior.",
      [
        "Si el tirador sale libre, tiro.",
        "Si la defensa cambia, atacar el desajuste.",
        "Si el pívot abre, mano a mano y continuación.",
      ],
      ["Rechazo del mano a mano", "Corte a la espalda", "Inversión"],
      [
        "El pasador debe mantener el bote vivo.",
        "El bloqueo se coloca en el ángulo del tirador.",
        "El mano a mano se entrega pegado al cuerpo.",
      ],
      ["chicago", "pin down", "handoff", "floppy"],
    ),
    frames: [
      frame(
        "Entrada al codo",
        "1 arriba, 4 en el codo, 2 al ala y 3 en la esquina.",
        [
          offense(1, 0.5, 0.62, true),
          offense(2, 0.16, 0.4),
          offense(3, 0.92, 0.12),
          offense(4, 0.35, 0.36),
          offense(5, 0.64, 0.12),
        ],
      ),
      frame(
        "Pin down",
        "1 pasa a 4; 2 bloquea para 3 y 1 corta a la esquina.",
        [
          offense(1, 0.08, 0.12),
          offense(2, 0.76, 0.32),
          offense(3, 0.86, 0.4),
          offense(4, 0.4, 0.5, true),
          offense(5, 0.64, 0.12),
        ],
        [action("o1", "pass", "o4"), action("o2", "screen"), action("o3", "cut"), action("o1", "cut")],
      ),
      frame(
        "Mano a mano",
        "1 sube a recibir el mano a mano de 4; 3 y 2 abren el campo.",
        [
          offense(1, 0.4, 0.54, true),
          offense(2, 0.5, 0.6),
          offense(3, 0.86, 0.4),
          offense(4, 0.42, 0.48),
          offense(5, 0.64, 0.12),
        ],
        [action("o1", "cut"), action("o4", "handoff"), action("o2", "pop")],
      ),
      frame(
        "Ataque y pase extra",
        "1 ataca el codo y encuentra a 3 en el ala.",
        [
          offense(1, 0.5, 0.5),
          offense(2, 0.5, 0.62),
          offense(3, 0.84, 0.4, true),
          offense(4, 0.58, 0.18),
          offense(5, 0.72, 0.2),
        ],
        [action("o1", "pass", "o3"), action("o3", "shot"), action("o4", "roll")],
        700,
      ),
    ],
  });

  plays.push({
    title: "UCLA Cut",
    callCode: "UCLA",
    category: "Ataque",
    subcategory: "Corte UCLA",
    chapterId: "ataque",
    court: { type: "half", league: "fiba", mode: "players" },
    meta: meta(
      "Corte UCLA clásico para generar una entrada al poste bajo y una continuación.",
      [
        "Si el defensor sigue el corte, pase al poste bajo.",
        "Si la ayuda llega, apertura del poste alto.",
        "Si el ala sobredefiende, puerta atrás.",
      ],
      ["Puerta atrás", "Inversión", "Bloqueo directo tras el corte"],
      [
        "El bloqueo se coloca en el codo, no en el poste.",
        "El cortador debe esperar el bloqueo y atacar el aro.",
        "El pasador lee la ayuda antes de pasar.",
      ],
      ["ucla", "corte", "princeton", "poste"],
    ),
    frames: [
      frame(
        "1-4 alto",
        "1 arriba, 4 en el poste alto y 5 en el poste bajo.",
        [
          offense(1, 0.5, 0.62, true),
          offense(2, 0.16, 0.4),
          offense(3, 0.84, 0.4),
          offense(4, 0.5, 0.36),
          offense(5, 0.64, 0.12),
        ],
      ),
      frame(
        "Corte UCLA",
        "1 pasa a 2 y corta sobre el bloqueo de 4 hacia el poste bajo.",
        [
          offense(1, 0.4, 0.14),
          offense(2, 0.16, 0.4, true),
          offense(3, 0.84, 0.4),
          offense(4, 0.45, 0.4),
          offense(5, 0.64, 0.12),
        ],
        [action("o1", "pass", "o2"), action("o4", "screen"), action("o1", "cut")],
      ),
      frame(
        "Pase al poste",
        "2 encuentra a 1 en el poste bajo; 4 se abre y 5 bloquea para 3.",
        [
          offense(1, 0.38, 0.12, true),
          offense(2, 0.16, 0.4),
          offense(3, 0.86, 0.42),
          offense(4, 0.5, 0.6),
          offense(5, 0.75, 0.35),
        ],
        [action("o2", "pass", "o1"), action("o4", "pop"), action("o5", "screen"), action("o3", "cut")],
      ),
      frame(
        "Finalización interior",
        "1 ataca el aro desde el poste bajo.",
        [
          offense(1, 0.5, 0.08, true),
          offense(2, 0.14, 0.38),
          offense(3, 0.86, 0.4),
          offense(4, 0.56, 0.24),
          offense(5, 0.72, 0.2),
        ],
        [action("o1", "shot")],
        700,
      ),
    ],
  });

  plays.push({
    title: "Floppy",
    callCode: "FLOPPY",
    category: "Ataque",
    subcategory: "Bloqueos para tirador",
    chapterId: "ataque",
    court: { type: "half", league: "fiba", mode: "players" },
    meta: meta(
      "Liberar a un tirador con un doble bloqueo y una salida al ala.",
      [
        "Si el tirador sale libre, tiro inmediato.",
        "Si la defensa persigue por arriba, rizo al aro.",
        "Si cambian, jugar al bloqueador que se abre.",
      ],
      ["Rizo", "Fade", "Puerta atrás", "Bloqueo directo tras el tiro"],
      [
        "El tirador elige el lado según la defensa.",
        "Los bloqueadores deben estar hombro con hombro.",
        "El pasador mantiene el balón alto.",
      ],
      ["floppy", "tirador", "doble bloqueo", "shooter"],
    ),
    frames: [
      frame(
        "Formación Floppy",
        "1 arriba con balón. 2 y 3 en los postes bajos; 4 y 5 en los codos.",
        [
          offense(1, 0.5, 0.62, true),
          offense(2, 0.64, 0.12),
          offense(3, 0.36, 0.12),
          offense(4, 0.35, 0.36),
          offense(5, 0.65, 0.36),
        ],
      ),
      frame(
        "Doble bloqueo",
        "4 y 5 forman un doble bloqueo para que 2 salga al ala.",
        [
          offense(1, 0.58, 0.58, true),
          offense(2, 0.82, 0.42),
          offense(3, 0.36, 0.12),
          offense(4, 0.52, 0.28),
          offense(5, 0.62, 0.34),
        ],
        [action("o1", "dribble"), action("o4", "screen"), action("o5", "screen"), action("o2", "cut")],
      ),
      frame(
        "Tiro liberado",
        "1 pasa a 2 y 2 finaliza desde el ala.",
        [
          offense(1, 0.56, 0.52),
          offense(2, 0.84, 0.4, true),
          offense(3, 0.36, 0.12),
          offense(4, 0.5, 0.22),
          offense(5, 0.64, 0.24),
        ],
        [action("o1", "pass", "o2"), action("o2", "shot")],
        700,
      ),
    ],
  });

  plays.push({
    title: "Zipper SLOB",
    callCode: "ZIPPER SLOB",
    category: "Balones fuera",
    subcategory: "SLOB",
    chapterId: "balones",
    court: { type: "half", league: "fiba", mode: "players" },
    meta: meta(
      "Saque de banda con corte zipper para entrar en bloqueo directo.",
      [
        "Si el corte zipper sale libre, pase directo.",
        "Si la defensa niega, pase al poste alto.",
        "Si el bloqueo directo se hunde, tiro de pull-up.",
      ],
      ["Pase al poste alto", "Puerta atrás", "Bloqueo indirecto"],
      [
        "El bloqueo zipper se coloca en la línea del carril.",
        "El cortador sube pegado al bloqueo.",
        "El inbounder entra rápido al bloqueo.",
      ],
      ["slob", "zipper", "balón fuera", "pick and roll"],
    ),
    frames: [
      frame(
        "Saque de banda",
        "1 saca desde la banda; 2 en el poste bajo, 5 en el codo.",
        [
          offense(1, 0.03, 0.55, true),
          offense(2, 0.36, 0.12),
          offense(3, 0.5, 0.62),
          offense(4, 0.2, 0.4),
          offense(5, 0.65, 0.36),
        ],
      ),
      frame(
        "Corte zipper",
        "5 bloquea para 2; 2 sube al slot y 1 pasa.",
        [
          offense(1, 0.03, 0.55),
          offense(2, 0.46, 0.55, true),
          offense(3, 0.5, 0.62),
          offense(4, 0.08, 0.12),
          offense(5, 0.55, 0.3),
        ],
        [action("o5", "screen"), action("o2", "cut"), action("o1", "pass", "o2"), action("o4", "cut")],
      ),
      frame(
        "Bloqueo directo",
        "5 sube a bloquear a 2; 2 ataca hacia el centro.",
        [
          offense(1, 0.1, 0.45),
          offense(2, 0.4, 0.58, true),
          offense(3, 0.88, 0.4),
          offense(4, 0.08, 0.12),
          offense(5, 0.52, 0.55),
        ],
        [action("o5", "screen"), action("o2", "dribble")],
      ),
      frame(
        "Caída y finalización",
        "5 cae al aro y 2 encuentra la ventana.",
        [
          offense(1, 0.1, 0.45),
          offense(2, 0.44, 0.52),
          offense(3, 0.86, 0.4),
          offense(4, 0.08, 0.12),
          offense(5, 0.52, 0.08, true),
        ],
        [action("o2", "pass", "o5"), action("o5", "shot")],
        700,
      ),
    ],
  });

  plays.push({
    title: "Hammer SLOB",
    callCode: "HAMMER",
    category: "Balones fuera",
    subcategory: "SLOB",
    chapterId: "balones",
    court: { type: "half", league: "fiba", mode: "players" },
    meta: meta(
      "Saque de banda con back screen y hammer para el tiro de esquina.",
      [
        "Si la ayuda llega al drive, pase al corner.",
        "Si el hammer se defiende, puerta atrás.",
        "Si el back screen libera, pase directo al aro.",
      ],
      ["Corte a la esquina", "Puerta atrás", "Tiro desde el codo"],
      [
        "El back screen se vende con una finta de salida.",
        "El hammer se orienta a la esquina del lado débil.",
        "El tirador mantiene el espacio hasta el pase.",
      ],
      ["slob", "hammer", "back screen", "balón fuera"],
    ),
    frames: [
      frame(
        "Caja de saque",
        "1 saca; 2 en el poste bajo, 4 en el ala y 5 en el codo.",
        [
          offense(1, 0.03, 0.55, true),
          offense(2, 0.36, 0.12),
          offense(3, 0.92, 0.12),
          offense(4, 0.2, 0.4),
          offense(5, 0.65, 0.36),
        ],
      ),
      frame(
        "Back screen",
        "2 bloquea la espalda de la defensa de 4; 4 corta al poste bajo.",
        [
          offense(1, 0.03, 0.55),
          offense(2, 0.3, 0.35),
          offense(3, 0.92, 0.12),
          offense(4, 0.4, 0.12, true),
          offense(5, 0.82, 0.22),
        ],
        [action("o2", "screen"), action("o4", "cut"), action("o1", "pass", "o4"), action("o5", "screen")],
      ),
      frame(
        "Drive y hammer",
        "4 ataca la línea de fondo; 5 sella el hammer para 3.",
        [
          offense(1, 0.1, 0.4),
          offense(2, 0.3, 0.4),
          offense(3, 0.92, 0.12),
          offense(4, 0.2, 0.08, true),
          offense(5, 0.82, 0.2),
        ],
        [action("o4", "dribble"), action("o5", "screen")],
      ),
      frame(
        "Tiro de esquina",
        "4 encuentra a 3 en la esquina y 3 finaliza.",
        [
          offense(1, 0.1, 0.4),
          offense(2, 0.32, 0.4),
          offense(3, 0.92, 0.12, true),
          offense(4, 0.22, 0.1),
          offense(5, 0.8, 0.2),
        ],
        [action("o4", "pass", "o3"), action("o3", "shot")],
        700,
      ),
    ],
  });

  plays.push({
    title: "2-3 Zone: rotación",
    callCode: "ZONE 23",
    category: "Defensa",
    subcategory: "Zona",
    chapterId: "defensa",
    court: { type: "half", league: "fiba", mode: "players" },
    meta: meta(
      "Desplazamiento básico de la 2-3: bascular con el balón y proteger el poste bajo.",
      [
        "El ala del lado débil sube al carril de pase.",
        "El poste bajo defiende el corte por línea de fondo.",
        "El exterior del lado del balón presiona el tiro.",
      ],
      ["Ajuste a 1-3-1", "Trampa en la esquina", "Cambio a individual"],
      [
        "Manos activas y comunicación constante.",
        "No abrir el centro en la basculación.",
        "Cerrar el rebote desde el lado débil.",
      ],
      ["defensa", "2-3", "zona", "rotación"],
    ),
    frames: [
      frame(
        "2-3 inicial",
        "Dos arriba, tres abajo. 1 con balón en la cabecera.",
        [
          offense(1, 0.5, 0.62, true),
          offense(2, 0.18, 0.4),
          offense(3, 0.82, 0.4),
          offense(4, 0.35, 0.2),
          offense(5, 0.65, 0.2),
          defense(1, 0.5, 0.58),
          defense(2, 0.2, 0.42),
          defense(3, 0.8, 0.42),
          defense(4, 0.36, 0.18),
          defense(5, 0.64, 0.18),
        ],
      ),
      frame(
        "Balón al ala",
        "1 pasa a 2. La zona bascula hacia el lado del balón.",
        [
          offense(1, 0.5, 0.62),
          offense(2, 0.18, 0.4, true),
          offense(3, 0.82, 0.4),
          offense(4, 0.35, 0.2),
          offense(5, 0.65, 0.2),
          defense(1, 0.42, 0.55),
          defense(2, 0.1, 0.38),
          defense(3, 0.72, 0.4),
          defense(4, 0.28, 0.18),
          defense(5, 0.56, 0.2),
        ],
        [
          action("o1", "pass", "o2"),
          action("d1", "rotation"),
          action("d2", "rotation"),
          action("d3", "rotation"),
          action("d4", "rotation"),
          action("d5", "rotation"),
        ],
      ),
      frame(
        "Ayuda y cobertura",
        "2 penetra; X4 ayuda, X5 cubre el poste y X2 recupera.",
        [
          offense(1, 0.52, 0.56),
          offense(2, 0.25, 0.3, true),
          offense(3, 0.86, 0.38),
          offense(4, 0.42, 0.2),
          offense(5, 0.7, 0.26),
          defense(1, 0.4, 0.48),
          defense(2, 0.22, 0.34),
          defense(3, 0.7, 0.38),
          defense(4, 0.34, 0.12),
          defense(5, 0.58, 0.14),
        ],
        [action("o2", "dribble"), action("d1", "rotation"), action("d2", "rotation"), action("d3", "rotation"), action("d4", "rotation"), action("d5", "rotation")],
      ),
    ],
  });

  return {
    title: "Jugadas habituales",
    team: "Clínica de jugadas",
    season: "2026",
    description:
      "Una selección de las acciones más habituales del baloncesto moderno: Spain PnR, Horns Flare, Pistol/Zoom, Chicago, UCLA, Floppy, Zipper SLOB, Hammer y 2-3. Basado en playbooks de NBA, EuroLeague, FIBA y recursos de entrenadores.",
    coverColor: "#38bdf8",
    chapters: [
      { id: "ataque", title: "Ataque", color: "#f97316" },
      { id: "balones", title: "Balones fuera", color: "#38bdf8" },
      { id: "defensa", title: "Defensa", color: "#a3e635" },
    ],
    plays,
  };
}
