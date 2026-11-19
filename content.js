/*
  All site content lives here. To add something, copy an entry in `items` and edit it.
  type: "project" | "integration" | "writing" | "video" | "podcast" | "talk"
  date: "YYYY-MM-DD", "YYYY-MM" or "YYYY" (used for sorting; newest first)
  featured: true pins an item to the top
  youtubeId: adds a video thumbnail
*/
window.PORTFOLIO = {
  profile: {
    name: "David Joy",
    eyebrow: "David Joy · Director, AI, Ecosystem & Partnerships",
    // Wrap one phrase in *asterisks* to highlight it.
    headline: "I build partner ecosystems, AI integrations and *the teams behind them.*",
    lede: "Fifteen years across data, cloud and AI. I lead a global solutions architecture team at Cockroach Labs, host the Big Ideas in App Architecture podcast, and write code with AI tools every day.",
    place: "Dallas, Texas",
    endYear: 2026,
    card: [
      { label: "Now", value: "Director, AI, Ecosystem & Partnerships at Cockroach Labs" },
      { label: "Leads", value: "Eight solutions architects across the US, EMEA and APAC" },
      { label: "Hosts", value: "Big Ideas in App Architecture podcast" },
      { label: "Builds", value: "With Claude Code and Codex, daily, for 3.5+ years" },
      { label: "Before", value: "DataStax, Walmart eCommerce, Fiserv, Sungard AS, BT via Tech Mahindra" },
      { label: "Based", value: "Dallas–Fort Worth, Texas" }
    ],
    links: [
      { label: "GitHub", url: "https://github.com/david7joy" },
      { label: "LinkedIn", url: "https://www.linkedin.com/in/david-joy-dj" }
    ],
    footer: "David Joy · Dallas–Fort Worth, Texas."
  },

  stats: [
    { value: "15+", label: "years in data, cloud and AI" },
    { value: "33", label: "partner integrations in the directory from the certification program I lead" },
    { value: "71", label: "episodes in the Big Ideas in App Architecture feed; I host the show" },
    { value: "9", label: "published posts, several co-authored with AWS and Microsoft" },
    { value: "9", label: "talks and webinars, from GenAI apps to payments for AI agents" }
  ],

  now: [
    { title: "Rig", text: "A toolkit that lets an AI agent run an app, drive it and prove that a change works." },
    { title: "Agent-ready databases", text: "Plugins and skills that bring CockroachDB expertise into Claude Code, Codex and Cursor." },
    { title: "Forward-deployed architects", text: "Turning a solutions team into builders who ship with AI coding tools." }
  ],

  /* Places to find more. Leave url empty to hide a link until you have one. */
  library: {
    profiles: [
      { label: "Cockroach Labs blog", url: "https://www.cockroachlabs.com/author/david-joy/" },
      { label: "Podcast", url: "https://www.cockroachlabs.com/big-ideas-podcast/" },
      { label: "Podcast on YouTube", url: "https://www.youtube.com/playlist?list=PL_QaflmEF2e_qCul_43FZ76FPEPodRScX" },
      { label: "GitHub", url: "https://github.com/david7joy" },
      { label: "X", url: "https://x.com/Joybeanns" },
      { label: "YouTube", url: "https://www.youtube.com/@joybeans" },
      { label: "Substack", url: "https://thejoybeans.substack.com/" },
      { label: "Medium", url: "https://medium.com/@david.joy1588" }
    ]
  },

  /*
    The journey, newest first: one entry per chapter. tone is the chapter's colour.
  */
  journey: [
    { year: 2026, place: "Cockroach Labs · building with agents", coords: "Now · Dallas, Texas", world: "Agents", tone: "#0f6b7a",
      title: "Today I build for agents, with agents.",
      body: [
        "I lead AI, ecosystem and partnerships work at Cockroach Labs. When coding agents arrived, my team met them where they work: plugins for Claude Code, Codex and Cursor, and a LangChain integration for agent memory.",
        "I also changed how the team works. Solutions architects became builders who ship integrations, demos and proofs of concept themselves.",
        "On the side I am building Rig, a toolkit that lets an AI agent run an app, drive it and prove that a change works."
      ],
      facts: [
        { value: 34, label: "skills in the Codex plugin" },
        { value: 3.5, suffix: "+", label: "years coding with AI, daily" }
      ],
      links: [
        { label: "Claude Code plugin", url: "https://claude.com/marketplace/plugins/cockroachdb" },
        { label: "Codex launch post", url: "https://www.cockroachlabs.com/blog/cockroachdb-plugin-for-chatgpt-and-codex/" },
        { label: "langchain-cockroachdb", url: "https://github.com/cockroachdb/langchain-cockroachdb" }
      ] },

    { year: 2025, place: "Behind the microphone", coords: "Big Ideas in App Architecture", world: "The podcast", tone: "#9a2f73",
      title: "Somewhere along the way I picked up a microphone.",
      body: [
        "I host Big Ideas in App Architecture, where founders, CTOs and architects explain how real systems get built and what broke along the way.",
        "Guests have included Charity Majors, Joe Duffy, Peter Mattis and Spencer Kimball. It is the best education I have ever had."
      ],
      facts: [
        { value: 71, label: "episodes in the feed" }
      ],
      links: [
        { label: "The show", url: "https://www.cockroachlabs.com/big-ideas-podcast/" },
        { label: "Charity Majors", url: "https://www.youtube.com/watch?v=6mX3zqMkfp4" },
        { label: "Spencer Kimball", url: "https://www.youtube.com/watch?v=SSx7df1gtmk" }
      ] },

    { year: 2022, place: "Cockroach Labs", coords: "Distributed SQL · Cockroach Labs", world: "The ecosystem", tone: "#0f6b7a",
      title: "Before the title, I was the architect in the room.",
      body: [
        "I joined Cockroach Labs as a partner solutions architect, working with AWS, Google Cloud and Microsoft. I wrote Terraform, built demos, co-authored guides with their engineers and presented at AWS re:Invent.",
        "Then I was asked to lead. Architect to director took under four years, and the certification program I started is now a public directory of partner integrations."
      ],
      facts: [
        { value: 3, label: "roles in four years" },
        { value: 33, label: "partner integrations in the directory" },
        { value: 3, label: "regions: US, EMEA, APAC" }
      ],
      links: [
        { label: "Partner directory", url: "https://www.cockroachlabs.com/product/partner-integrations/" },
        { label: "re:Invent 2025 talk", url: "https://www.cockroachlabs.com/blog/resilient-genai-agentic-apps-intelligent-memory/" },
        { label: "Bedrock demo", url: "https://www.youtube.com/watch?v=OHb4HrDdJvY" }
      ] },

    { year: 2019, place: "DataStax", coords: "Distributed databases · DataStax", world: "500 demos", tone: "#b3352e",
      title: "Before that, five hundred demos taught me to explain anything.",
      body: [
        "At DataStax I moved from building models to helping companies run data at scale. I stood in front of CIOs, CTOs and developers and showed them what was possible, live.",
        "I also found the part I love most: working with partners. I trained more than a thousand people across cloud providers and systems integrators."
      ],
      facts: [
        { value: 500, suffix: "+", label: "demos and proofs of concept" },
        { value: 1000, suffix: "+", label: "partner staff trained" }
      ],
      links: [
        { label: "Stargate demo", url: "https://www.youtube.com/watch?v=SU3Z4msZaDU" },
        { label: "NoSQLBench demo", url: "https://www.youtube.com/watch?v=jHZeGy_ZHcU" }
      ] },

    { year: 2017, place: "Dallas, Texas", coords: "32.99°N 96.75°W · Dallas, Texas", world: "Starting over", tone: "#5546a8",
      title: "Before that, I moved to the USA to be a student again.",
      body: [
        "A master's in business analytics at UT Dallas, and every spare hour on machine learning. I built recommenders, a neural network that invents names, and learned to put models into production.",
        "At Fiserv I built a model that recommended how much cash each ATM should hold, then the pipeline to feed it. After that came A/B testing for Walmart eCommerce."
      ],
      links: [
        { label: "Movie recommender", url: "https://github.com/david7joy/Recommendation_App" },
        { label: "Name generator", url: "https://github.com/david7joy/Name_Generator_Application_Tensorflow_CharRNNModel" },
        { label: "Serving models with Docker", url: "https://github.com/david7joy/tensorflow-servable-docker" }
      ] },

    { year: 2010, place: "Pune, India · Hertfordshire, UK", coords: "18.52°N 73.86°E · Pune → Hertfordshire, UK", world: "Telecom and data", tone: "#1f7a43",
      title: "Before that, seven years learning how businesses actually run.",
      body: [
        "My first job was at Tech Mahindra, as a business analyst on telecom systems for BT, in India and then in the UK. I wrote requirements, ran releases and automated the boring parts with shell scripts.",
        "Then business intelligence at Sungard Availability Services. I built dashboards and models that product leaders used to make real decisions, including a pricing tool that sorted through about ten thousand products.",
        "It taught me to ask what the number is for before building anything."
      ],
      facts: [
        { value: 7, label: "years as an analyst" },
        { value: 10000, prefix: "~", label: "products priced by one tool" },
        { value: 2, label: "countries" }
      ] },

    { year: 2008, place: "Nagpur, India", coords: "21.15°N 79.09°E · Nagpur, India", world: "Where it started", tone: "#b4511a",
      title: "And it all started with a graphics card.",
      body: [
        "I was an engineering student in Nagpur who had just built his first PC from scratch. Then my NVIDIA GeForce 8500 GT died, and the shop had no replacement.",
        "So I went to find the supplier myself. Three buses, two auto-rickshaws and eight hours later, I walked into a warehouse in the middle of nowhere. The man listened to the whole story, said he had no 8500s left, and handed me an 8600. No charge.",
        "I learned two things that day: go and find it yourself, and people help those who show up. Everything above this line came from that."
      ],
      facts: [
        { value: 8, label: "hours on the road" },
        { value: 3, label: "buses" },
        { value: 0, prefix: "₹", label: "paid for the upgrade" }
      ] }
  ],

  /*
    Career, newest first, from the resume. Each company has one or more roles.
    `year` and `short` feed the line on the left monitor; `onScreen: false` keeps a stop off it.
  */
  career: [
    { org: "Cockroach Labs", short: "Cockroach Labs", year: 2022, logo: "cockroachlabs", tint: "#AEDE54", tile: "#0b0f0c", place: "Dallas, Texas", from: "Sep 2022", to: "Present",
      awards: [
        { name: "Partner Manager of the Year", date: "2026" },
        { name: "President's Club", date: "FY 2026" }
      ],
      roles: [
        { title: "Director, Solutions Architecture (AI, Ecosystem & Channels)", from: "Jan 2026", to: "Present", tags: ["Claude Code", "Codex", "MCP", "LangChain"], points: [
          "Lead the global partner solutions architecture team, with a team lead for EMEA and APAC.",
          "Turned partner solutions architects into forward-deployed builders who ship integrations, demos and reference architectures with Claude Code and Codex.",
          "Directed the team behind the CockroachDB plugins for Claude Code, Codex and ChatGPT, and Cursor, plus the LangChain and Google MCP Toolbox integrations.",
          "Built the ecosystem certification program, now a public directory of 33 partner integrations.",
          "Host of the Big Ideas in App Architecture podcast." ] },
        { title: "Senior Manager, Solutions Architecture (AI, Ecosystem & Channels)", from: "Aug 2024", to: "Dec 2025", tags: ["AWS", "Amazon Bedrock", "Vector search"], points: [
          "Managed a global team of four senior solutions architects covering cloud, ISV and AI partners.",
          "Led the technical side of the AWS alliance and the CockroachDB integration with Amazon Bedrock.",
          "Presented on stage at AWS re:Invent, Google Cloud Next and Microsoft Ignite." ] },
        { title: "Senior Sales Engineer, Channels (Partner Solutions Architect)", from: "Sep 2022", to: "Aug 2024", tags: ["AWS", "Google Cloud", "Terraform"], points: [
          "Led AWS and Google Cloud integrations and wrote the Terraform to deploy CockroachDB on AWS.",
          "Ran partner briefings, proofs of concept and live demos." ] }
      ] },
    { org: "DataStax", short: "DataStax", year: 2019, logo: "datastax", tint: "#111111", place: "Santa Clara, California", from: "Oct 2019", to: "Sep 2022",
      badge: "Now part of IBM",
      about: "The company behind Astra DB and a major contributor to Apache Cassandra. IBM acquired DataStax in May 2025.",
      roles: [
        { title: "Senior Data Architect (Partnerships)", tags: ["Astra DB", "Cassandra", "Spark", "Kafka"], points: [
          "Ran 500+ demos and proofs of concept for buyers from developers to CTOs.",
          "Trained 1,000+ partner engineers at IBM, AWS, Google Cloud, Azure and global systems integrators.",
          "Built joint solutions with AWS, Google Cloud and Azure, and customer-facing demos on Astra DB, Astra Streaming (Pulsar), Cassandra, Spark and Kafka.",
          "Created the Astra DB sizing method and materials adopted by all presales architects." ] }
      ] },
    { org: "LatentView Analytics", short: "LatentView", year: 2019, onScreen: false, place: "Sunnyvale, California", from: "Jul 2019", to: "Oct 2019",
      roles: [
        { title: "Analytics Consultant, Walmart eCommerce", tags: ["Python", "Databricks", "Airflow"], points: [
          "Built the A/B testing framework and data pipeline for the Sam's Club website and mobile app, on Python, Databricks and Airflow." ] }
      ] },
    { org: "Fiserv", short: "Fiserv", year: 2018, logo: "fiserv", place: "Dallas–Fort Worth, Texas", from: "May 2018", to: "May 2019",
      awards: [
        { name: "Inspire and Achieve Excellence Award", date: "Apr 2019" },
        { name: "Create with Purpose Award", date: "Aug 2018" }
      ],
      roles: [
        { title: "Data Science & BI Analyst", tags: ["Machine learning", "IBM Cognos"], points: [
          "Developed an ATM cash-level recommendation model and the dashboard that put it in analysts' hands." ] }
      ] },
    { org: "Sungard Availability Services", short: "Sungard AS", year: 2015, place: "Pune, India", from: "Jan 2015", to: "Jul 2017",
      awards: [
        { name: "Certificate of Recognition", date: "Oct 2015" }
      ],
      roles: [
        { title: "Business Intelligence Analyst", points: [
          "Provided analytics to product leadership, including churn analysis and a pricing tool covering about 10,000 products." ] }
      ] },
    { org: "Tech Mahindra", short: "Tech Mahindra", year: 2010, place: "Pune, India and Hertfordshire, UK", from: "Oct 2010", to: "Dec 2014",
      awards: [
        { name: "Pat on the Back", date: "Jun 2014" },
        { name: "Pat on the Back", date: "Dec 2012" },
        { name: "Cookie Award", date: "Jun 2011" }
      ],
      roles: [
        { title: "Business Analyst / Presales", points: [
          "Supported presales and led requirements gathering and release management on telecom projects." ] }
      ] }
  ],

  education: [
    { years: "2017 – 2019", school: "The University of Texas at Dallas", degree: "Master of Science, Business Analytics", award: "Graduate Student of the Year, 2017–2018" },
    { years: "2006 – 2010", school: "Nagpur University, India", degree: "Bachelor of Engineering, Computer Engineering" }
  ],



  items: [
    /* ---------- type "integration" = company work: built with my team, published by Cockroach Labs ---------- */
    { type: "integration", featured: true, date: "2026-11-05", title: "CockroachDB plugin for ChatGPT and OpenAI Codex",
      description: "A plugin with 34 skills that gives ChatGPT and Codex CockroachDB-specific guidance, with an optional connection to CockroachDB Cloud.",
      url: "https://github.com/cockroachdb/codex-plugin", source: "OpenAI Codex", role: "Team lead, launch co-author", tags: ["mcp", "agents", "openai"] },
    { type: "integration", featured: true, date: "2026-03-11", title: "CockroachDB plugin for Claude Code",
      description: "Explore schemas, write SQL, debug queries and manage clusters from Claude Code, with MCP tools, a DBA agent, skills and SQL safety hooks.",
      url: "https://claude.com/marketplace/plugins/cockroachdb", source: "Anthropic", role: "Built by my team", tags: ["mcp", "agents", "anthropic", "claude"] },
    { type: "integration", date: "2026-02-02", title: "langchain-cockroachdb",
      description: "LangChain package for CockroachDB: native vector search, chat history, LangGraph agent state and a long-term memory store.",
      url: "https://github.com/cockroachdb/langchain-cockroachdb", source: "LangChain", role: "Built by my team", tags: ["langgraph", "vector", "memory", "python"] },
    { type: "integration", date: "2026", title: "CockroachDB plugin for Cursor",
      description: "Connects Cursor to CockroachDB with shared skills, two MCP backends, the ccloud CLI and rule sets.",
      url: "https://github.com/cockroachdb/cursor-plugin", source: "Cursor", role: "Built by my team", tags: ["mcp", "agents"] },
    { type: "integration", date: "2026", title: "Agent Skills for CockroachDB",
      description: "Structured operational skills for agents, spanning onboarding, development, performance, resilience, observability and security.",
      url: "https://github.com/cockroachlabs/cockroachdb-skills", source: "GitHub", role: "Built by my team", tags: ["skills", "agents"] },
    { type: "integration", date: "2026", title: "CockroachDB in MCP Toolbox for Databases",
      description: "A CockroachDB source for Google's MCP Toolbox, with tools to list schemas and tables and run SQL.",
      url: "https://mcp-toolbox.dev/integrations/cockroachdb/source/", source: "Google MCP Toolbox", role: "Built by my team", tags: ["mcp", "google"] },
    { type: "integration", featured: true, date: "2026", title: "CockroachDB partner integrations directory",
      description: "The public directory of 33 partner integrations from the certification program I lead, across AI and agents, data pipelines, developer tools, infrastructure, observability and financial services.",
      url: "https://www.cockroachlabs.com/product/partner-integrations/", source: "Cockroach Labs", role: "Program lead", tags: ["ecosystem", "certification", "isv"] },

    /* ---------- type "project" = my own projects: open source, on my GitHub ---------- */
    { type: "project", date: "2024-06-05", title: "Multi-region trading app on CockroachDB",
      description: "Demo trading app with a React front end and Node.js back end, running on CockroachDB across US West, US East and EU West.",
      url: "https://github.com/david7joy/trade-app-crdb-multi-region", source: "GitHub", tags: ["react", "node", "multi-region", "demo"] },
    { type: "project", date: "2024-08-14", title: "CockroachDB multi-region on AWS (Terraform)",
      description: "Terraform to launch a secure, self-hosted multi-region CockroachDB cluster on AWS, optionally behind AWS Client VPN.",
      url: "https://github.com/david7joy/CockroachDB-Multi-Region-on-AWS", source: "GitHub", tags: ["terraform", "aws", "infrastructure"] },
    { type: "project", date: "2022-10-06", title: "CockroachDB single-region on AWS (Terraform)",
      description: "Terraform that builds a three-node CockroachDB cluster on AWS with a load balancer and Client VPN.",
      url: "https://github.com/david7joy/CockroachDB-on-AWS-Single-Region", source: "GitHub", tags: ["terraform", "aws", "infrastructure"] },
    { type: "project", date: "2019-02-28", title: "TensorFlow Serving with Docker and Django",
      description: "Walkthrough of saving a TensorFlow model, serving it with TensorFlow Serving in Docker and calling it from Django.",
      url: "https://github.com/david7joy/tensorflow-servable-docker", source: "GitHub", tags: ["machine learning", "python", "docker"] },
    { type: "project", date: "2019-02-13", title: "Name generator with a character RNN",
      description: "An LSTM character model in TensorFlow that invents names, served through TensorFlow Serving with a Django front end.",
      url: "https://github.com/david7joy/Name_Generator_Application_Tensorflow_CharRNNModel", source: "GitHub", tags: ["machine learning", "lstm", "python"] },
    { type: "project", date: "2018-12-05", title: "Movie recommendation app",
      description: "Django movie recommender using collaborative filtering on user ratings, with popularity and correlation methods for comparison.",
      url: "https://github.com/david7joy/Recommendation_App", source: "GitHub", tags: ["machine learning", "django", "python"] },

    /* ---------- Writing ---------- */
    /* ---------- Substack (thejoybeans.substack.com) ---------- */
    { type: "writing", date: "2025-11-19", title: "Deperciating insights",
      url: "https://thejoybeans.substack.com/p/deperciating-insights", source: "Substack", role: "Author", tags: [] },
    { type: "writing", date: "2024-11-26", title: "Give a man a purpose and the ability to achieve it, and he will crawl over broken glass with a smile.",
      url: "https://thejoybeans.substack.com/p/give-a-man-a-purpose-and-the-ability", source: "Substack", role: "Author", tags: [] },
    { type: "writing", date: "2024-10-18", title: "Are LLMs really REASONING or are we overfitting the intelligence messaging to LLMs?",
      url: "https://thejoybeans.substack.com/p/are-llms-really-reasoning-or-are", source: "Substack", role: "Author", tags: [] },
    { type: "writing", date: "2024-10-04", title: "50 Episodes of \"Big Ideas in App Architecture\"",
      url: "https://thejoybeans.substack.com/p/50-episodes-of-big-ideas-in-app-architecture", source: "Substack", role: "Author", tags: [] },
    { type: "writing", date: "2024-09-27", title: "NotebookLM by Google is NOW Absolutely Amazing, but Why?",
      url: "https://thejoybeans.substack.com/p/notebooklm-by-google-is-now-absolutely", source: "Substack", role: "Author", tags: [] },
    { type: "writing", date: "2024-09-25", title: "Practical Considerations for Running CockroachDB on AWS in Multi-Region Production",
      url: "https://thejoybeans.substack.com/p/practical-considerations-for-running", source: "Substack", role: "Author", tags: [] },
    { type: "writing", date: "2024-09-25", title: "I killed my personal website.",
      url: "https://thejoybeans.substack.com/p/coming-soon", source: "Substack", role: "Author", tags: [] },

    /* ---------- Earlier writing on Medium ---------- */
    { type: "writing", date: "2019-04-04", title: "A/B Testing: Clearing Perspective",
      description: "A/B testing and the chi-square test, worked through in Python.",
      url: "https://medium.com/@david.joy1588/a-b-testing-clearing-perspective-bb28a9a4d5c7", source: "Medium", role: "Author", tags: ["a/b testing", "statistics", "python"] },
    { type: "writing", date: "2019-03-20", title: "A bit of Kafka",
      description: "Notes on Apache Kafka and streaming analytics.",
      url: "https://medium.com/@david.joy1588/a-bit-of-kafka-952cab07d945", source: "Medium", role: "Author", tags: ["kafka", "streaming"] },
    { type: "writing", date: "2019-03-19", title: "Spark Essentials",
      description: "The essentials of Apache Spark for big data work.",
      url: "https://medium.com/@david.joy1588/spark-essentials-33c0ab7509c6", source: "Medium", role: "Author", tags: ["spark", "big data"] },
    { type: "writing", date: "2019-02-11", title: "Data Science Interview Prep",
      description: "Preparation notes for data science and machine learning interviews.",
      url: "https://medium.com/@david.joy1588/data-science-interview-prep-cf32c03f5780", source: "Medium", role: "Author", tags: ["data science", "machine learning"] },
    { type: "writing", date: "2019-01-21", title: "Google Cloud Platform for Data Scientists and an Introduction to BigQuery, Part 1",
      description: "Getting started with Google Cloud and BigQuery as a data scientist.",
      url: "https://medium.com/@david.joy1588/google-cloud-platform-gcp-for-data-scientist-and-introduction-to-big-query-part-1-4f04022ea1e9", source: "Medium", role: "Author", tags: ["google cloud", "bigquery"] },
    { type: "writing", date: "2018-11-07", title: "An Exploration into Churn Modeling, Part 2",
      description: "Exploratory analysis and modelling of customer churn in Python.",
      url: "https://medium.com/@david.joy1588/an-exploration-into-churn-modeling-part-2-8d5eddd17a9f", source: "Medium", role: "Author", tags: ["churn", "python", "data science"] },
    { type: "writing", date: "2018-10-31", title: "An Exploration into Churn Modelling, Part 1",
      description: "Predicting customer churn: framing the problem and the data.",
      url: "https://medium.com/@david.joy1588/an-exploration-into-churn-modelling-part1-311529444c91", source: "Medium", role: "Author", tags: ["churn", "machine learning", "data science"] },

    { type: "writing", featured: true, date: "2026-11-05", title: "Introducing the CockroachDB plugin for ChatGPT and Codex: Database expertise for the agentic era",
      description: "Announces the plugin that gives agents schema design, PostgreSQL migration and slow-query guidance.",
      url: "https://www.cockroachlabs.com/blog/cockroachdb-plugin-for-chatgpt-and-codex/", source: "Cockroach Labs", role: "Co-author", tags: ["openai", "agents"] },
    { type: "writing", date: "2025-11-18", title: "Distributed SQL + Vectors: A Match Made in Heaven",
      description: "How CockroachDB combines transactional and vector workloads in one PostgreSQL-compatible database for real-time AI applications.",
      url: "https://www.cockroachlabs.com/blog/distributed-sql-plus-vectors/", source: "Cockroach Labs", role: "Author", tags: ["vector", "ai"] },
    { type: "writing", date: "2024-12-20", title: "Operating CockroachDB on Microsoft Azure – Part 4",
      description: "Backups, compute and storage choices, security, data locality, performance testing and survivability planning on Azure.",
      url: "https://www.cockroachlabs.com/blog/unlocking-scale-cockroachdb-azure-part-4/", source: "Cockroach Labs", role: "Co-author with Microsoft", tags: ["azure", "microsoft"] },
    { type: "writing", date: "2024-11-25", title: "Hard Rock Digital Solves Data Sovereignty with CockroachDB on AWS Outposts",
      description: "How one logical database on AWS Outposts meets state-by-state sports betting data residency rules.",
      url: "https://www.cockroachlabs.com/blog/hard-rock-digital-aws-reinvent/", source: "Cockroach Labs", role: "Co-author", tags: ["aws", "gaming", "data residency"] },
    { type: "writing", date: "2024-11-04", title: "Operating CockroachDB on Microsoft Azure – Part 3",
      description: "Compares self-managed VMs, the hosted service and AKS, and weighs single-region against multi-region designs.",
      url: "https://www.cockroachlabs.com/blog/operating-cockroachdb-on-msft/", source: "Cockroach Labs", role: "Co-author with Microsoft", tags: ["azure", "microsoft"] },
    { type: "writing", date: "2024-08-20", title: "Unlocking Enterprise Scale with CockroachDB: Deploying on Microsoft Azure",
      description: "Deployment options on Azure VMs, AKS and the managed service, with command-line walkthroughs.",
      url: "https://www.cockroachlabs.com/blog/enterprise-scale-deploying-microsoft-azure/", source: "Cockroach Labs", role: "Co-author with Microsoft", tags: ["azure", "microsoft"] },
    { type: "writing", date: "2024-06-27", title: "Unlocking Enterprise Scale with CockroachDB on Microsoft Azure",
      description: "Opens the series on running CockroachDB on Azure for enterprise scale, resilience and performance.",
      url: "https://www.cockroachlabs.com/blog/scale-cockroachdb-on-microsoft-azure/", source: "Cockroach Labs", role: "Co-author with Microsoft", tags: ["azure", "microsoft"] },
    { type: "writing", date: "2024-06-10", title: "Real-time Analytics on AWS Redshift with Continuous Ingestion from CockroachDB",
      description: "Tutorial on streaming CockroachDB changefeeds to Amazon S3 and loading them continuously into Redshift.",
      url: "https://www.cockroachlabs.com/blog/real-time-analytics-on-aws-redshift/", source: "Cockroach Labs", role: "Co-author with AWS", tags: ["aws", "analytics", "cdc"] },
    { type: "writing", date: "2023-11-06", title: "How to Unlock Real-Time Data Streams with CockroachDB and Amazon MSK",
      description: "Hands-on guide to streaming CockroachDB changefeeds into Amazon MSK, including SCRAM/SASL authentication and Kafka ACLs.",
      url: "https://aws.amazon.com/blogs/apn/how-to-unlock-real-time-data-streams-with-cockroachdb-and-amazon-msk/", source: "AWS Partner Network blog", role: "Co-author with AWS", tags: ["aws", "kafka", "cdc"] },
    { type: "writing", date: "2022-04-14", title: "Web3 Changes Nothing for DeFi Apps and Here's Why",
      description: "Argues that Web3 and DeFi apps still face classic scalability and availability problems.",
      url: "https://web.archive.org/web/20250619201351/https://www.datastax.com/blog/web3-changes-nothing-for-defi-apps-and-here-s-why", source: "DataStax blog (archived)", role: "Co-author", tags: ["web3", "cassandra"] },

    /* ---------- Podcast: episodes I hosted, each linked to its YouTube video ---------- */
    { type: "podcast", featured: true, date: "2026-11-18", title: "What Do You Build with 5x Engineering Power? Inside Stripe's Engineering Culture", youtubeId: "2cdd3dH0z24",
      guest: "Aleodor Tabarcea", guestRole: "Engineering leader", org: "Stripe", description: "With Aleodor Tabarcea, Engineering leader at Stripe.",
      url: "https://www.youtube.com/watch?v=2cdd3dH0z24", source: "Big Ideas in App Architecture", role: "Host", tags: ["ai"] },
    { type: "podcast", featured: true, date: "2026-10-21", title: "Sovereignty, Scale, and the Infrastructure Behind the Bet", youtubeId: "IOEXLF9pm5c",
      guest: "Justin Cosnett", guestRole: "Chief Product Officer", org: "Continent 8 Technologies", description: "With Justin Cosnett, Chief Product Officer at Continent 8 Technologies.",
      url: "https://www.youtube.com/watch?v=IOEXLF9pm5c", source: "Big Ideas in App Architecture", role: "Host", tags: ["igaming", "data sovereignty"] },
    { type: "podcast", date: "2026-09-16", title: "Introducing Cockroach Continuum", youtubeId: "UGQUaXFepQQ",
      guest: "Tara Shankar Jana", guestRole: "Sr. Director of Product Marketing", org: "Cockroach Labs", description: "With Tara Shankar Jana, Sr. Director of Product Marketing at Cockroach Labs.",
      url: "https://www.youtube.com/watch?v=UGQUaXFepQQ", source: "Big Ideas in App Architecture", role: "Host", tags: [] },
    { type: "podcast", date: "2026-08-19", title: "A Love Letter to the Database: Industry Shifts, Lessons Learned, and What's Next", youtubeId: "q8vi5PSRivY",
      guest: "Perry Krug", guestRole: "", org: "", description: "With Perry Krug.",
      url: "https://www.youtube.com/watch?v=q8vi5PSRivY", source: "Big Ideas in App Architecture", role: "Host", tags: [] },
    { type: "podcast", date: "2026-07-22", title: "The Everything Trap: Building AI Software That Lasts", youtubeId: "QSaS4kElGY0",
      guest: "Sam Hilsman", guestRole: "Co-founder and CEO", org: "CloudFruit", description: "With Sam Hilsman, Co-founder and CEO at CloudFruit.",
      url: "https://www.youtube.com/watch?v=QSaS4kElGY0", source: "Big Ideas in App Architecture", role: "Host", tags: ["ai"] },
    { type: "podcast", date: "2026-06-17", title: "Why Inference Engineering Is the Next Big Role in AI", youtubeId: "GPFPXUJ_PYU",
      guest: "Philip Kiely", guestRole: "Engineer and author", org: "Baseten", description: "With Philip Kiely, Engineer and author at Baseten.",
      url: "https://www.youtube.com/watch?v=GPFPXUJ_PYU", source: "Big Ideas in App Architecture", role: "Host", tags: ["ai", "inference"] },
    { type: "podcast", date: "2026-05-20", title: "Distributed Systems, Linkerd, and the Cost of Network Calls", youtubeId: "DEt_Bw02Kqk",
      guest: "William Morgan", guestRole: "Co-founder and CEO", org: "Buoyant", description: "With William Morgan, Co-founder and CEO at Buoyant.",
      url: "https://www.youtube.com/watch?v=DEt_Bw02Kqk", source: "Big Ideas in App Architecture", role: "Host", tags: [] },
    { type: "podcast", date: "2026-04-15", title: "Making Software as Durable as Data", youtubeId: "UHPXoKUOVo4",
      guest: "Peter Kraft", guestRole: "Co-founder", org: "DBOS", description: "With Peter Kraft, Co-founder at DBOS.",
      url: "https://www.youtube.com/watch?v=UHPXoKUOVo4", source: "Big Ideas in App Architecture", role: "Host", tags: [] },
    { type: "podcast", date: "2026-03-18", title: "Breaking the Pillars: Rethinking Observability", youtubeId: "6mX3zqMkfp4",
      guest: "Charity Majors", guestRole: "Co-founder and CTO", org: "Honeycomb", description: "With Charity Majors, Co-founder and CTO at Honeycomb.",
      url: "https://www.youtube.com/watch?v=6mX3zqMkfp4", source: "Big Ideas in App Architecture", role: "Host", tags: ["observability"] },
    { type: "podcast", date: "2026-02-18", title: "How to Transform Dev Workflows with CI/CS and AI Agents", youtubeId: "B5zaelGlUrg",
      guest: "Tomer Karin", guestRole: "Software architect", org: "", description: "With Tomer Karin, software architect.",
      url: "https://www.youtube.com/watch?v=B5zaelGlUrg", source: "Big Ideas in App Architecture", role: "Host", tags: ["ai", "agents"] },
    { type: "podcast", date: "2026-01-21", title: "AI, Market Cycles, and the Systems Built to Outlast Them", youtubeId: "SSx7df1gtmk",
      guest: "Spencer Kimball", guestRole: "Co-founder and CEO", org: "Cockroach Labs", description: "With Spencer Kimball, Co-founder and CEO at Cockroach Labs.",
      url: "https://www.youtube.com/watch?v=SSx7df1gtmk", source: "Big Ideas in App Architecture", role: "Host", tags: ["ai"] },
    { type: "podcast", date: "2025-07-02", title: "How to Scale Data Infrastructure from Startup to Enterprise", youtubeId: "TxIFDu4pdLA",
      guest: "Nishant Raman", guestRole: "Data infrastructure engineer", org: "", description: "With Nishant Raman, data infrastructure engineer.",
      url: "https://www.youtube.com/watch?v=TxIFDu4pdLA", source: "Big Ideas in App Architecture", role: "Host", tags: [] },
    { type: "podcast", date: "2025-05-30", title: "Code, Cloud, and Karate: The Unlikely Path to Cloud Architecture", youtubeId: "kbU_9-010wY",
      guest: "Masaru Hoshi", guestRole: "Cloud Architect", org: "Qlik", description: "With Masaru Hoshi, Cloud Architect at Qlik.",
      url: "https://www.youtube.com/watch?v=kbU_9-010wY", source: "Big Ideas in App Architecture", role: "Host", tags: [] },
    { type: "podcast", date: "2025-05-16", title: "How to Build an AI-Native Organization", youtubeId: "ckrcVlnNkF4",
      guest: "Peter Mattis", guestRole: "Co-founder, CTO and CPO", org: "Cockroach Labs", description: "With Peter Mattis, Co-founder, CTO and CPO at Cockroach Labs.",
      url: "https://www.youtube.com/watch?v=ckrcVlnNkF4", source: "Big Ideas in App Architecture", role: "Host", tags: ["ai"] },
    { type: "podcast", date: "2025-02-14", title: "Inside Infrastructure as Code with Pulumi's Founder & CEO", youtubeId: "-mOXTpkG3x4",
      guest: "Joe Duffy", guestRole: "Founder and CEO", org: "Pulumi", description: "With Joe Duffy, Founder and CEO at Pulumi.",
      url: "https://www.youtube.com/watch?v=-mOXTpkG3x4", source: "Big Ideas in App Architecture", role: "Host", tags: [] },
    { type: "podcast", date: "2025-01-30", title: "Inside Ericsson: How AI and Automation Are Shaping Telecom", youtubeId: "2NofMWpYxlc",
      guest: "Anand Bajaj", guestRole: "Chief Architect", org: "Ericsson", description: "With Anand Bajaj, Chief Architect at Ericsson.",
      url: "https://www.youtube.com/watch?v=2NofMWpYxlc", source: "Big Ideas in App Architecture", role: "Host", tags: ["ai"] },
    { type: "podcast", date: "2025-01-16", title: "Unboxing the Cloud: AI, Microservices, and Resilient Databases", youtubeId: "1TkrOzsxCqs",
      guest: "Jim Hatcher", guestRole: "Solutions Engineer", org: "Cockroach Labs", description: "With Jim Hatcher, Solutions Engineer at Cockroach Labs.",
      url: "https://www.youtube.com/watch?v=1TkrOzsxCqs", source: "Big Ideas in App Architecture", role: "Host", tags: [] },
    { type: "podcast", date: "2024-10-31", title: "Strategic AI and Cloud Solutions: GitHub's Blueprint for Modern Development Success", youtubeId: "aFjsr1rq3Ks",
      guest: "Ari LiVigni", guestRole: "Senior Cloud Solutions Architect", org: "GitHub", description: "With Ari LiVigni, Senior Cloud Solutions Architect at GitHub.",
      url: "https://www.youtube.com/watch?v=aFjsr1rq3Ks", source: "Big Ideas in App Architecture", role: "Host", tags: ["ai"] },
    { type: "podcast", date: "2024-10-17", title: "Cloud Architecture in the Public Sector: Balancing Innovation and Security", youtubeId: "6OzTT32B0mw",
      guest: "Nik Mayer", guestRole: "Principal Cloud Architect", org: "Maximus", description: "With Nik Mayer, Principal Cloud Architect at Maximus.",
      url: "https://www.youtube.com/watch?v=6OzTT32B0mw", source: "Big Ideas in App Architecture", role: "Host", tags: [] },
    { type: "podcast", date: "2024-10-03", title: "GenAI Meets Celebrity: Inside Cameo's Journey from Startup to Stardom", youtubeId: "BLz-IzUa-u8",
      guest: "Dom Scandinaro", guestRole: "CTO", org: "Cameo", description: "With Dom Scandinaro, CTO at Cameo.",
      url: "https://www.youtube.com/watch?v=BLz-IzUa-u8", source: "Big Ideas in App Architecture", role: "Host", tags: ["ai"] },
    { type: "podcast", date: "2024-09-19", title: "The Journey from Mainframe to Adopting Generative AI", youtubeId: "uSg0Ukox7h0",
      guest: "Samarth Shah", guestRole: "Senior Network Architect", org: "Equifax", description: "With Samarth Shah, Senior Network Architect at Equifax.",
      url: "https://www.youtube.com/watch?v=uSg0Ukox7h0", source: "Big Ideas in App Architecture", role: "Host", tags: ["ai"] },
    { type: "podcast", date: "2024-08-13", title: "Modernizing Your Cloud Strategy", youtubeId: "dHxxpB-RPdc",
      guest: "Ryan Berry", guestRole: "Senior VP of Cloud Architecture", org: "OneStream", description: "With Ryan Berry, Senior VP of Cloud Architecture at OneStream.",
      url: "https://www.youtube.com/watch?v=dHxxpB-RPdc", source: "Big Ideas in App Architecture", role: "Host", tags: [] },
    { type: "podcast", date: "2024-07-25", title: "Driving Digital Transformation", youtubeId: "pnIsAba648A",
      guest: "Ignacio Segovia", guestRole: "Chief Architect", org: "Altimetrik", description: "With Ignacio Segovia, Chief Architect at Altimetrik.",
      url: "https://www.youtube.com/watch?v=pnIsAba648A", source: "Big Ideas in App Architecture", role: "Host", tags: [] },
    { type: "podcast", date: "2024-05-31", title: "How to Simplify Your Software Architecture", youtubeId: "ItaLqjuG-K8",
      guest: "Rob Reid", guestRole: "Technical Evangelist", org: "Cockroach Labs", description: "With Rob Reid, Technical Evangelist at Cockroach Labs.",
      url: "https://www.youtube.com/watch?v=ItaLqjuG-K8", source: "Big Ideas in App Architecture", role: "Host", tags: [] },
    { type: "podcast", date: "2024-05-16", title: "Behind the Scenes with Vimeo's Director of Enterprise Architecture", youtubeId: "VquxHrkCAtI",
      guest: "Sachin Joshi", guestRole: "Director of Enterprise Architecture", org: "Vimeo", description: "With Sachin Joshi, Director of Enterprise Architecture at Vimeo.",
      url: "https://www.youtube.com/watch?v=VquxHrkCAtI", source: "Big Ideas in App Architecture", role: "Host", tags: [] },
    { type: "podcast", date: "2024-04-25", title: "Discussing Data Trends in the AI Era", youtubeId: "fbGo73eoc-o",
      guest: "Gajanan Chinchwadkar", guestRole: "CTO", org: "Hypermode", description: "With Gajanan Chinchwadkar, CTO at Hypermode.",
      url: "https://www.youtube.com/watch?v=fbGo73eoc-o", source: "Big Ideas in App Architecture", role: "Host", tags: ["ai"] },
    { type: "podcast", date: "2024-04-25", title: "How to Leverage Real-Time Data Processing for Enterprises", youtubeId: "K9oHX55g6o0",
      guest: "Andrew Sellers", guestRole: "Head of Technology", org: "Confluent", description: "With Andrew Sellers, Head of Technology at Confluent.",
      url: "https://www.youtube.com/watch?v=K9oHX55g6o0", source: "Big Ideas in App Architecture", role: "Host", tags: [] },
    { type: "podcast", date: "2024-04-18", title: "Inside the Mind of the Chief Architect at Index Exchange", youtubeId: "t-ei4w6Rc4E",
      guest: "Joshua Prismon", guestRole: "Chief Architect", org: "Index Exchange", description: "With Joshua Prismon, Chief Architect at Index Exchange.",
      url: "https://www.youtube.com/watch?v=t-ei4w6Rc4E", source: "Big Ideas in App Architecture", role: "Host", tags: [] },
    { type: "podcast", date: "2024-04-11", title: "Solving for Scale: Real-Time Retail Experiences", youtubeId: "B49Z_1OnRm4",
      guest: "JP Grace", guestRole: "CTO", org: "Endear", description: "With JP Grace, CTO at Endear.",
      url: "https://www.youtube.com/watch?v=B49Z_1OnRm4", source: "Big Ideas in App Architecture", role: "Host", tags: [] },
    { type: "podcast", date: "2024-04-05", title: "Data, Acquisitions, and AI: Insights from FiscalNote's CTO", youtubeId: "R8BmhauEyq4",
      guest: "Vlad Eidelman", guestRole: "CTO", org: "FiscalNote", description: "With Vlad Eidelman, CTO at FiscalNote.",
      url: "https://www.youtube.com/watch?v=R8BmhauEyq4", source: "Big Ideas in App Architecture", role: "Host", tags: ["ai"] },
    { type: "podcast", date: "2024-03-21", title: "Unwrapping Moonpig: Architectural Insights into Personalization and Scalability", youtubeId: "oslMmczIEfM",
      guest: "Alexis Lowe", guestRole: "Principal Engineer", org: "Moonpig", description: "With Alexis Lowe, Principal Engineer at Moonpig.",
      url: "https://www.youtube.com/watch?v=oslMmczIEfM", source: "Big Ideas in App Architecture", role: "Host", tags: [] },
    { type: "podcast", date: "2024-03-07", title: "Simplifying Solutions Architecture", youtubeId: "utqSuNUObLY",
      guest: "Brian Johnson", guestRole: "Sr. Solutions Architect", org: "Booz Allen Hamilton", description: "With Brian Johnson, Sr. Solutions Architect at Booz Allen Hamilton.",
      url: "https://www.youtube.com/watch?v=utqSuNUObLY", source: "Big Ideas in App Architecture", role: "Host", tags: [] },
    { type: "podcast", date: "2024-03-01", title: "How to Solve for Data Intelligence at Scale", youtubeId: "UC9hgwvTlzQ",
      guest: "Madalina Tanasie", guestRole: "CTO", org: "Collibra", description: "With Madalina Tanasie, CTO at Collibra.",
      url: "https://www.youtube.com/watch?v=UC9hgwvTlzQ", source: "Big Ideas in App Architecture", role: "Host", tags: ["ai"] },
    { type: "podcast", date: "2024-02-23", title: "How to Make Your Applications Smarter", youtubeId: "Dlj7b-eNN_g",
      guest: "Rod Senra", guestRole: "VP of Engineering", org: "Loadsmart", description: "With Rod Senra, VP of Engineering at Loadsmart.",
      url: "https://www.youtube.com/watch?v=Dlj7b-eNN_g", source: "Big Ideas in App Architecture", role: "Host", tags: [] },
    { type: "podcast", date: "2024-01-25", title: "Scaling for 2 Billion Events per Day", youtubeId: "70SBRCewqJs",
      guest: "Majid Fatemian", guestRole: "Principal Software Engineer", org: "Red Ventures", description: "With Majid Fatemian, Principal Software Engineer at Red Ventures.",
      url: "https://www.youtube.com/watch?v=70SBRCewqJs", source: "Big Ideas in App Architecture", role: "Host", tags: [] },
    { type: "podcast", date: "2024-01-19", title: "The Data Behind Digital Marketing", youtubeId: "A4ALSOw2pIw",
      guest: "Mike Hurwitz", guestRole: "Software Architect", org: "Bluecore", description: "With Mike Hurwitz, Software Architect at Bluecore.",
      url: "https://www.youtube.com/watch?v=A4ALSOw2pIw", source: "Big Ideas in App Architecture", role: "Host", tags: [] },
    { type: "podcast", date: "2024-01-16", title: "A Lesson in Scaling: How Kami Handled 25x Growth", youtubeId: "oKZq10sQhQw",
      guest: "Jordan Thoms", guestRole: "Co-founder and CTO", org: "Kami", description: "With Jordan Thoms, Co-founder and CTO at Kami.",
      url: "https://www.youtube.com/watch?v=oKZq10sQhQw", source: "Big Ideas in App Architecture", role: "Host", tags: [] },
    { type: "podcast", date: "2023-12-07", title: "Mastering Multi-Cloud", youtubeId: "mCfrYreyDXs",
      guest: "Erol Kavas", guestRole: "Director", org: "PwC", description: "With Erol Kavas, Director at PwC.",
      url: "https://www.youtube.com/watch?v=mCfrYreyDXs", source: "Big Ideas in App Architecture", role: "Host", tags: [] },
    { type: "podcast", date: "2023-11-30", title: "From FedEx to Five Guys: Designing Digital Experiences", youtubeId: "WOfHyxlzxTI",
      guest: "Matt Bowman", guestRole: "VP of Software Engineering", org: "Yext", description: "With Matt Bowman, VP of Software Engineering at Yext.",
      url: "https://www.youtube.com/watch?v=WOfHyxlzxTI", source: "Big Ideas in App Architecture", role: "Host", tags: [] },
    { type: "podcast", date: "2023-11-17", title: "Reliability and Scalability in a Data-Driven World", youtubeId: "USEa6Ndx83A",
      guest: "Mike Gordon", guestRole: "VP of Platform Engineering", org: "Fivetran", description: "With Mike Gordon, VP of Platform Engineering at Fivetran.",
      url: "https://www.youtube.com/watch?v=USEa6Ndx83A", source: "Big Ideas in App Architecture", role: "Host", tags: [] },
    { type: "podcast", date: "2023-11-09", title: "Enabling a Data-Driven and Innovative Engineering Culture at Amplitude", youtubeId: "SJfWSq0pi7Q",
      guest: "Shadi Rostami", guestRole: "SVP of Engineering", org: "Amplitude", description: "With Shadi Rostami, SVP of Engineering at Amplitude.",
      url: "https://www.youtube.com/watch?v=SJfWSq0pi7Q", source: "Big Ideas in App Architecture", role: "Host", tags: [] },
    { type: "podcast", date: "2023-11-01", title: "How Estée Lauder Scales Strong Engineering Culture", youtubeId: "z3IP5zk0cWU",
      guest: "Meg Adams", guestRole: "Executive Director of Platform Engineering", org: "Estée Lauder", description: "With Meg Adams, Executive Director of Platform Engineering at Estée Lauder.",
      url: "https://www.youtube.com/watch?v=z3IP5zk0cWU", source: "Big Ideas in App Architecture", role: "Host", tags: [] },
    { type: "podcast", date: "2023-10-23", title: "How to Build Conversational AI to Improve the Customer Experience", youtubeId: "7wCF9kZ0Ds0",
      guest: "Akshay Kayastha", guestRole: "Senior Engineering Manager", org: "ConverseNow", description: "With Akshay Kayastha, Senior Engineering Manager at ConverseNow.",
      url: "https://www.youtube.com/watch?v=7wCF9kZ0Ds0", source: "Big Ideas in App Architecture", role: "Host", tags: ["ai"] },
    { type: "podcast", date: "2023-09-21", title: "The Full Package: How Route Architects Its All-in-One Post-Purchase Platform", youtubeId: "DV4FVdsFiwE",
      guest: "Siddhartha Sandhu", guestRole: "Engineering Manager", org: "Route", description: "With Siddhartha Sandhu, Engineering Manager at Route.",
      url: "https://www.youtube.com/watch?v=DV4FVdsFiwE", source: "Big Ideas in App Architecture", role: "Host", tags: [] },

    /* ---------- Video ---------- */
    { type: "video", date: "2025-12-18", title: "How to Build GenAI Apps with CockroachDB & AWS Bedrock (recording)", youtubeId: "yFk3qad-DPM",
      description: "Webinar recording on vector search, retrieval-augmented generation and a live GenAI demo.",
      url: "https://www.youtube.com/watch?v=yFk3qad-DPM", source: "YouTube · CockroachDB", role: "Presenter", tags: ["bedrock", "aws", "rag"] },
    { type: "video", featured: true, date: "2025-05-14", title: "How to build AI-enabled apps using CockroachDB and AWS Bedrock", youtubeId: "OHb4HrDdJvY",
      description: "Demo of a banking app on CockroachDB with a Bedrock-powered assistant that answers natural-language questions.",
      url: "https://www.youtube.com/watch?v=OHb4HrDdJvY", source: "YouTube · CockroachDB", role: "Presenter", tags: ["bedrock", "aws", "rag"] },
    { type: "video", date: "2021", title: "Stargate.io Demo on DataStax Astra DB using Postman", youtubeId: "SU3Z4msZaDU",
      description: "Walkthrough of the Stargate API gateway with Postman against Astra DB.",
      url: "https://www.youtube.com/watch?v=SU3Z4msZaDU", source: "YouTube · DataStax Developers", role: "Presenter", tags: ["cassandra", "api"] },
    { type: "video", date: "2021", title: "NoSQLBench demo: Designing Test Workloads", youtubeId: "jHZeGy_ZHcU",
      description: "Designing NoSQLBench test workloads and using bindings to generate realistic synthetic data.",
      url: "https://www.youtube.com/watch?v=jHZeGy_ZHcU", source: "YouTube · DataStax Developers", role: "Presenter", tags: ["cassandra", "benchmarking"] },

    /* ---------- Talks and webinars ---------- */
    { type: "talk", featured: true, date: "2026-12-15", title: "How to Build a Payments System Ready for AI Agents",
      description: "Webinar with Rob Reid: failover without double charges, serializable spend limits and keeping fraud reads off the spend path.",
      url: "https://www.cockroachlabs.com/webinars/payments-architecture-ai-agents/", source: "Cockroach Labs webinar", role: "Speaker", tags: ["payments", "agents", "upcoming"] },
    { type: "talk", date: "2026-07-16", title: "Are your agents on ACID?",
      description: "With Mike Stonebraker and Qian Li of DBOS, on keeping agent workflows reliable.",
      url: "https://www.cockroachlabs.com/webinars/are-your-agents-on-acid/", source: "Cockroach Labs webinar", role: "Speaker", tags: ["agents", "dbos"] },
    { type: "talk", date: "2026-05-19", title: "Architecting Persistent Memory for Multi-Agent Systems",
      description: "With Adam B. Struck, CEO of Memori Labs, on shared long-term memory for agents.",
      url: "https://www.cockroachlabs.com/webinars/architecting-persistent-long-term-memory-for-multi-agent-systems/", source: "Cockroach Labs webinar", role: "Speaker", tags: ["agents", "memory"] },
    { type: "talk", date: "2025-12-17", title: "Introduction to CockroachDB on AWS",
      description: "Interactive session with Rob Reid on running CockroachDB on AWS and connecting it to AWS services.",
      url: "https://www.cockroachlabs.com/webinars/intro-to-crdb-on-aws/", source: "Cockroach Labs webinar", role: "Speaker", tags: ["aws"] },
    { type: "talk", date: "2025-12-04", title: "AWS re:Invent 2025: Build Resilient GenAI & Agentic Apps with Intelligent Memory",
      description: "Conference session in Las Vegas, presented with Virag Tripathi.",
      url: "https://www.cockroachlabs.com/blog/resilient-genai-agentic-apps-intelligent-memory/", source: "AWS re:Invent", role: "Speaker", tags: ["aws", "agents", "conference"] },
    { type: "talk", date: "2025-08-06", title: "How to Build GenAI Apps with CockroachDB & AWS Bedrock",
      description: "CockroachDB plus Amazon Bedrock for vector-aware GenAI apps, with a live demo.",
      url: "https://www.cockroachlabs.com/webinars/how-to-build-gen-ai-apps/", source: "Cockroach Labs webinar", role: "Speaker", tags: ["bedrock", "aws"] },
    { type: "talk", date: "2025-07-29", title: "How to build a scalable, resilient payments system for the AI era",
      description: "With Jim Hatcher: payment architecture covering failover, geo-partitioning for regulation, and scaling.",
      url: "https://www.cockroachlabs.com/webinars/how-to-build-a-scalable-payment-system/", source: "Cockroach Labs webinar", role: "Speaker", tags: ["payments"] },
    { type: "talk", date: "2025-04-17", title: "The Resilience Roadshow with AWS: Dallas",
      description: "In-person event at the AWS office in Dallas; moderated the customer panel on building resilient applications.",
      url: "https://www.cockroachlabs.com/theresilienceedge25/dallas/", source: "AWS & Cockroach Labs", role: "Panel moderator", tags: ["aws", "roadshow"] },
    { type: "talk", date: "2025-03-04", title: "Unlock scalable, resilient gaming experiences with CockroachDB on AWS",
      description: "With Ben Cooke of AWS, on running resilient gaming workloads.",
      url: "https://www.cockroachlabs.com/webinars/scalable-resilient-gaming-experiences-aws/", source: "Cockroach Labs webinar", role: "Speaker", tags: ["gaming", "aws"] }
  ]
};
