import {
  blockRegistry,
  fieldId,
  type VisualDocumentData,
  type VisualSection,
} from "./schema";

export type History = {
  past: VisualDocumentData[];
  present: VisualDocumentData;
  future: VisualDocumentData[];
  group?: string;
};
export const beginHistory = (present: VisualDocumentData): History => ({
  past: [],
  present,
  future: [],
});
export type HistoryAction =
  | {
      type: "change";
      apply: (doc: VisualDocumentData) => VisualDocumentData;
      group?: string;
    }
  | { type: "undo" | "redo" | "stop" }
  | { type: "reset" | "commit"; doc: VisualDocumentData };
export function historyReducer(state: History, action: HistoryAction): History {
  if (action.type === "commit") {
    const pin = (doc: VisualDocumentData) => ({
      ...doc,
      id: action.doc.id,
      revision: action.doc.revision,
    });
    return {
      past: state.past.map(pin),
      present: action.doc,
      future: state.future.map(pin),
    };
  }
  if (action.type === "reset") return beginHistory(action.doc);
  if (action.type === "stop") return { ...state, group: undefined };
  if (action.type === "undo") {
    const previous = state.past.at(-1);
    return previous
      ? {
          past: state.past.slice(0, -1),
          present: previous,
          future: [state.present, ...state.future],
        }
      : state;
  }
  if (action.type === "redo") {
    const [next, ...future] = state.future;
    return next
      ? { past: [...state.past, state.present], present: next, future }
      : state;
  }
  if (action.type !== "change") return state;
  const present = action.apply(state.present);
  if (present === state.present) return state;
  const past =
    action.group && state.group === action.group
      ? state.past
      : [...state.past.slice(-59), state.present];
  return { past, present, future: [], group: action.group };
}
export function changeSection(
  doc: VisualDocumentData,
  id: string,
  edit: (item: VisualSection) => VisualSection,
) {
  return {
    ...doc,
    layout: {
      ...doc.layout,
      sections: doc.layout.sections.map((item) =>
        item.id === id ? edit(item) : item,
      ),
    },
  };
}
export function moveSection(
  doc: VisualDocumentData,
  id: string,
  target: string,
) {
  if (id === target) return doc;
  const sections = [...doc.layout.sections];
  const from = sections.findIndex((item) => item.id === id),
    to = sections.findIndex((item) => item.id === target);
  if (
    from < 1 ||
    to < 1 ||
    from === sections.length - 1 ||
    to === sections.length - 1
  )
    return doc;
  sections.splice(to, 0, sections.splice(from, 1)[0]);
  return { ...doc, layout: { ...doc.layout, sections } };
}
export function removeSection(doc: VisualDocumentData, id: string) {
  const block = doc.layout.sections.find((item) => item.id === id);
  if (!block || blockRegistry[block.type].protected) return doc;
  const strip = (values: VisualDocumentData["es"]) =>
    Object.fromEntries(
      Object.entries(values).filter(([key]) => !key.startsWith(id + "__")),
    );
  return {
    ...doc,
    layout: {
      ...doc.layout,
      sections: doc.layout.sections.filter((item) => item.id !== id),
    },
    es: strip(doc.es),
    en: strip(doc.en),
  };
}
export function duplicateSection(
  doc: VisualDocumentData,
  id: string,
  newId: string,
) {
  const index = doc.layout.sections.findIndex((item) => item.id === id);
  const block = doc.layout.sections[index];
  if (
    !block ||
    blockRegistry[block.type].protected ||
    doc.layout.sections.length >= 60
  )
    return doc;
  const sections = [...doc.layout.sections];
  sections.splice(index + 1, 0, { ...block, id: newId });
  const copy = (values: VisualDocumentData["es"]) => {
    const next = { ...values };
    for (const field of blockRegistry[block.type].fields) {
      const value = values[fieldId(id, field)];
      if (value !== undefined) next[fieldId(newId, field)] = value;
    }
    return next;
  };
  return {
    ...doc,
    layout: { ...doc.layout, sections },
    es: copy(doc.es),
    en: copy(doc.en),
  };
}
