/** Fixed app guidance has no family facts and needs neither RAG nor a paid model. */
export function appGuidance(
  question: string,
  familyId: string,
  language: "es" | "en",
  role: string,
) {
  const es = language === "es";
  const normalized = question
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^[¿¡\s]+/, "");
  if (/^(?:hola|hello|hi|hey|buenos dias|buenas tardes|buenas noches)[!.?\s]*$/i.test(normalized))
    return {
      answer: es
        ? "¡Hola! Puedo ayudarte a explorar tus recuerdos y entender lo que estás leyendo. Pregúntame por una historia, una persona o cómo moverte por la biblioteca."
        : "Hello! I can help you explore your memories and understand what you are reading. Ask about a story, a person, or how to navigate the library.",
      status: "GUIDANCE",
      passageIds: [] as string[],
      destinations: [] as { title: string; href: string }[],
    };
  const navigation =
    /^(?:please |por favor )?(?:open|take me|go to|abre|abrir|llevame|llevarme|where (?:can i|are|is)|how (?:do i|can i|to)|donde (?:puedo|estan|esta)|como (?:puedo|se|subo|grabo))\b/i.test(
      normalized,
    );
  if (!navigation) return null;
  const routes = [
    {
      pattern: /\b(albums?|album(?:es)?)\b/i,
      path: "albums",
      en: "Albums",
      es: "Álbumes",
      reader: false,
    },
    {
      pattern: /\b(settings|ajustes|configuracion)\b/i,
      path: "settings",
      en: "Settings",
      es: "Ajustes",
      reader: false,
    },
    {
      pattern: /\b(stories|cuentos)\b/i,
      path: "stories",
      en: "Stories",
      es: "Cuentos",
      reader: true,
    },
    {
      pattern: /\b(music|musica)\b/i,
      path: "music",
      en: "Music",
      es: "Música",
      reader: false,
    },
    {
      pattern: /\b(upload|record a memory|subir|grabar un recuerdo)\b/i,
      path: "memories/new",
      en: "Add a memory",
      es: "Añadir recuerdo",
      reader: false,
    },
    {
      pattern: /\b(dashboard|inicio)\b/i,
      path: "dashboard",
      en: "Family library",
      es: "Biblioteca familiar",
      reader: true,
    },
  ];
  const route = routes.find((r) => r.pattern.test(normalized));
  if (!route) return null;
  if (role === "READER" && !route.reader)
    return {
      answer: es
        ? "Tu rol de lector no permite acceder a esa sección."
        : "Your reader role does not allow access to that section.",
      status: "GUIDANCE",
      passageIds: [] as string[],
      destinations: [] as { title: string; href: string }[],
    };
  const title = es ? route.es : route.en;
  return {
    answer: es
      ? `Puedes abrir «${title}» con el enlace de abajo. Los cambios se realizan en su pantalla correspondiente.`
      : `You can open ${title} using the link below. Changes are made on their own screen.`,
    status: "GUIDANCE",
    passageIds: [] as string[],
    destinations: [{ title, href: `/families/${familyId}/${route.path}` }],
  };
}
