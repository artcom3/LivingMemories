// Only legacy system messages are translated; family content is preserved.
const legacyMessages: Record<string, string> = {
  "El proveedor rechazó la clave o el acceso a esta función. Revisa los permisos y el plan de la cuenta.":
    "The provider rejected the API key or access to this feature. Check the account permissions and plan.",
  "El proveedor alcanzó su límite de consumo o peticiones. No reintentamos automáticamente para evitar cargos duplicados.":
    "The provider has reached its usage or request limit. We do not retry automatically to avoid duplicate charges.",
  "El proveedor está temporalmente saturado o no disponible. Conservamos tu preparación. Puedes intentar otra versión más tarde o configurar otro modelo disponible.":
    "The provider is temporarily busy or unavailable. Your preparation is saved. You can try another version later or configure another available model.",
  "El proveedor rechazó el modelo, la voz o los parámetros. Revisa la configuración de la integración.":
    "The provider rejected the model, voice, or parameters. Check the integration settings.",
  "Para estas pruebas usa audios de hasta 30 minutos, videos de hasta 10 minutos y un máximo de 30 minutos combinados por creación.":
    "For these trials, use audio up to 30 minutes, video up to 10 minutes, and a maximum combined duration of 30 minutes per creation.",
  "La transcripción es demasiado larga para esta prueba. Selecciona una grabación más breve.":
    "The transcript is too long for this trial. Select a shorter recording.",
  "Faltan las herramientas de procesamiento de medios. Ejecuta el worker de Docker.":
    "Media processing tools are missing. Run the Docker worker.",
  "No pudimos completar la generación. Conservamos la preparación y los resultados parciales. Revisa los archivos, los permisos y la conexión del proveedor antes de crear otra versión.":
    "We could not complete generation. Your preparation and partial results are saved. Check the files, permissions, and provider connection before creating another version.",
  "La generación quedó interrumpida. Revisa los resultados parciales antes de crear otra versión.":
    "Generation was interrupted. Review the partial results before creating another version.",
};
export function englishSystemMessage(message: string): string {
  return Object.hasOwn(legacyMessages, message)
    ? legacyMessages[message]
    : message;
}
export function sourceDisplayName(name: string): string {
  return name === "Relato escrito" ? "Written account" : name;
}
