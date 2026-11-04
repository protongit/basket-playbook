export function defaultPlayers() {
  return [
    { id: "o1", team: "offense", slot: "1", x: 0.5, y: 0.62, hasBall: true },
    { id: "o2", team: "offense", slot: "2", x: 0.16, y: 0.4, hasBall: false },
    { id: "o3", team: "offense", slot: "3", x: 0.84, y: 0.4, hasBall: false },
    { id: "o4", team: "offense", slot: "4", x: 0.3, y: 0.22, hasBall: false },
    { id: "o5", team: "offense", slot: "5", x: 0.7, y: 0.22, hasBall: false },
  ];
}

export function defaultFrame() {
  return {
    id: `f-${Math.random().toString(36).slice(2, 10)}`,
    label: "Posición inicial",
    note: "",
    durationMs: 900,
    players: defaultPlayers(),
    actions: [],
  };
}

export function defaultCourt() {
  return { type: "half", league: "fiba" };
}
