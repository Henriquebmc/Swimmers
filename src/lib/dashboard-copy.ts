import type { Locale } from "@/i18n/translations";

export type DashboardShellNav = {
  home: string;
  performance: string;
  meets: string;
  updateInfo: string;
  profileCoach: string;
  settings: string;
};

export type DashboardHomeCopy = {
  badge: string;
  fallbackAthlete: string;
  title: string;
  subtitle: string;
  secondaryCta: string;
  quickLinksTitle: string;
  quickLinksSubtitle: string;
  shortcuts: {
    performance: string;
    meets: string;
    updateInfo: string;
    profileCoach: string;
  };
  recentResultsTitle: string;
  recentResultsSubtitle: string;
  recentResultsEmpty: string;
  progressionTitle: string;
  progressionSubtitle: string;
  progressionFallback: string;
  noChartData: string;
  emptyStateTitle: string;
  emptyStateDescription: string;
  recordPinsLabel: string;
  recordPinsHelper: string;
  recordPinsEmpty: string;
  medalsLabel: string;
  medalsHelper: string;
  medalsGold: string;
  medalsSilver: string;
  medalsBronze: string;
  statsCoachLinked: string;
  noCoachShort: string;
};

export const dashboardChromeCopy: Record<Locale, { home: string; menuOpen: string; menuClose: string }> = {
  en: {
    home: "Home",
    menuOpen: "Open dashboard menu",
    menuClose: "Close dashboard menu",
  },
  "pt-BR": {
    home: "Home",
    menuOpen: "Abrir menu do dashboard",
    menuClose: "Fechar menu do dashboard",
  },
  es: {
    home: "Home",
    menuOpen: "Abrir menu del dashboard",
    menuClose: "Cerrar menú del dashboard",
  },
};

export const dashboardHomeCopy: Record<Locale, DashboardHomeCopy> = {
  en: {
    badge: "Athlete Home",
    fallbackAthlete: "Athlete",
    title: "Everything starts here, {name}.",
    subtitle:
      "Check your latest races, jump into your analytics, and keep your training story moving from one clean starting point.",
    secondaryCta: "Open Performance",
    quickLinksTitle: "Quick Access",
    quickLinksSubtitle: "Choose where you want to dive next.",
    shortcuts: {
      performance: "Track your progression and compare your latest times with your strongest event.",
      meets: "Browse imported races, compare competitions, and filter by stroke or distance.",
      updateInfo: "Fix extracted data or add manual results without leaving your flow.",
      profileCoach: "Review your athlete profile and keep your coach connection up to date.",
    },
    recentResultsTitle: "Recent Results",
    recentResultsSubtitle: "Your newest performances at a glance.",
    recentResultsEmpty: "Import a PDF to start building your race history here.",
    progressionTitle: "Featured Progression",
    progressionSubtitle:
      "We highlight the event that appears most often in your history so you can spot trends faster.",
    progressionFallback: "Your signature event will appear here",
    noChartData: "Upload your first results to unlock a progression chart on the home screen.",
    emptyStateTitle: "Bring in your first results",
    emptyStateDescription: "Upload a PDF to unlock history, charts, and a stronger athlete snapshot.",
    recordPinsLabel: "RECORDS",
    recordPinsHelper: "Official record markers captured from the PDF REC. column, including RDF and any other record tags.",
    recordPinsEmpty: "No official record marker has been imported yet.",
    medalsLabel: "Total Medals",
    medalsHelper: "Podium finishes based on stored placement positions.",
    medalsGold: "Gold",
    medalsSilver: "Silver",
    medalsBronze: "Bronze",
    statsCoachLinked: "Coach currently linked to your athlete profile.",
    noCoachShort: "Unlinked",
  },
  "pt-BR": {
    badge: "Central do atleta",
    fallbackAthlete: "Atleta",
    title: "Tudo começa aqui, {name}.",
    subtitle:
      "Veja suas provas mais recentes, entre nas análises e mantenha sua rotina de evolução organizada a partir de uma nova página inicial.",
    secondaryCta: "Abrir Desempenho",
    quickLinksTitle: "Acessos rápidos",
    quickLinksSubtitle: "Escolha para onde você quer mergulhar agora.",
    shortcuts: {
      performance: "Acompanhe sua progressão e compare os tempos mais recentes com o seu evento mais forte.",
      meets: "Explore provas importadas, compare competições e filtre por nado ou distância.",
      updateInfo: "Corrija dados extraídos ou adicione resultados manuais sem quebrar o fluxo.",
      profileCoach: "Revise seu perfil de atleta e mantenha o vínculo com o técnico em dia.",
    },
    recentResultsTitle: "Resultados recentes",
    recentResultsSubtitle: "Suas performances mais novas em um relance.",
    recentResultsEmpty: "Importe um PDF para começar a montar aqui o seu histórico de provas.",
    progressionTitle: "Progressão em destaque",
    progressionSubtitle:
      "Destacamos o evento que mais aparece no seu histórico para facilitar a leitura da evolução.",
    progressionFallback: "Seu evento principal vai aparecer aqui",
    noChartData: "Envie seus primeiros resultados para liberar um gráfico de progressão na home.",
    emptyStateTitle: "Traga seus primeiros resultados",
    emptyStateDescription: "Envie um PDF para liberar histórico, gráficos e um retrato mais completo do atleta.",
    recordPinsLabel: "RECORDES",
    recordPinsHelper: "Marcadores oficiais de recorde capturados da coluna REC. do PDF, incluindo RDF e outros tipos de recorde.",
    recordPinsEmpty: "Nenhum marcador oficial de recorde foi importado ainda.",
    medalsLabel: "Total de medalhas",
    medalsHelper: "Pódios calculados pelas colocações salvas em cada prova.",
    medalsGold: "Ouro",
    medalsSilver: "Prata",
    medalsBronze: "Bronze",
    statsCoachLinked: "Técnico atualmente vinculado ao seu perfil de atleta.",
    noCoachShort: "Sem vínculo",
  },
  es: {
    badge: "Centro del atleta",
    fallbackAthlete: "Atleta",
    title: "Todo empieza aquí, {name}.",
    subtitle:
      "Revisa tus pruebas más recientes, entra a tus análisis y mantén tu historia competitiva organizada desde una nueva página inicial.",
    secondaryCta: "Abrir Rendimiento",
    quickLinksTitle: "Accesos rápidos",
    quickLinksSubtitle: "Elige a dónde quieres sumergirte ahora.",
    shortcuts: {
      performance: "Sigue tu progresión y compara tus tiempos más recientes con tu evento más fuerte.",
      meets: "Explora pruebas importadas, compara competencias y filtra por estilo o distancia.",
      updateInfo: "Corrige datos extraídos o agrega resultados manuales sin romper tu flujo.",
      profileCoach: "Revisa tu perfil de atleta y mantén actualizada la relación con tu entrenador.",
    },
    recentResultsTitle: "Resultados recientes",
    recentResultsSubtitle: "Tus actuaciones más nuevas de un vistazo.",
    recentResultsEmpty: "Sube un PDF para empezar a construir aquí tu historial de pruebas.",
    progressionTitle: "Progresión destacada",
    progressionSubtitle:
      "Destacamos el evento que más se repite en tu historial para que detectes tendencias más rápido.",
    progressionFallback: "Tu evento principal aparecerá aquí",
    noChartData: "Sube tus primeros resultados para desbloquear un gráfico de progresión en la home.",
    emptyStateTitle: "Trae tus primeros resultados",
    emptyStateDescription: "Sube un PDF para desbloquear historial, gráficas y una visión más sólida del atleta.",
    recordPinsLabel: "RECORDS",
    recordPinsHelper: "Marcadores oficiales de récord capturados de la columna REC. del PDF, incluyendo RDF y otros tipos de récord.",
    recordPinsEmpty: "Todavía no se ha importado ningún marcador oficial de récord.",
    medalsLabel: "Total de medallas",
    medalsHelper: "Podios calculados a partir de las posiciones guardadas en cada prueba.",
    medalsGold: "Oro",
    medalsSilver: "Plata",
    medalsBronze: "Bronce",
    statsCoachLinked: "Entrenador actualmente vinculado a tu perfil de atleta.",
    noCoachShort: "Sin vínculo",
  },
};



