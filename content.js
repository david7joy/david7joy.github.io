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
    eyebrow: "David Joy · the long way round",
    // Wrap one phrase in *asterisks* to highlight it.
    headline: "In 2008 I crossed central India for eight hours to find *a graphics card.*",
    lede: "I have been going after the next hard thing ever since. Today I lead AI, ecosystem and partnerships work at Cockroach Labs, host a podcast, and build with AI every day. Here is how I got here.",
    endYear: 2026,
    links: [
      { label: "GitHub", url: "https://github.com/david7joy" },
      { label: "LinkedIn", url: "https://www.linkedin.com/in/david-joy-dj" },
      { label: "Podcast", url: "https://www.cockroachlabs.com/big-ideas-podcast/" },
      { label: "Blog", url: "https://www.cockroachlabs.com/author/david-joy/" }
    ],
    footer: "David Joy · Dallas–Fort Worth, Texas. No trackers, no frameworks: one page of HTML, CSS and JavaScript."
  },

  stats: [
    { value: "18", label: "years since that bus ride" },
    { value: "33", label: "partner integrations in the directory from the certification program I lead" },
    { value: "71", label: "episodes in the Big Ideas in App Architecture feed; I host the show" },
    { value: "9", label: "published posts, several co-authored with AWS and Microsoft" },
    { value: "9", label: "talks and webinars, from GenAI apps to payments for AI agents" }
  ],

  /*
    The journey: one entry per chapter, in order.
    tone is the chapter's colour. facts with a numeric value count up on screen.
  */
  journey: [
    { year: 2008, place: "Nagpur, India", coords: "21.15°N 79.09°E · Nagpur, India", world: "The warehouse", tone: "#ffb86b",
      title: "Three buses, two auto-rickshaws, one graphics card.",
      body: [
        "I was an engineering student who had just built his first PC from scratch. Then my NVIDIA GeForce 8500 GT died, and the shop had no replacement.",
        "So I went to find the supplier myself. Eight hours through towns I had never seen, to a warehouse in the middle of nowhere. The man listened to the whole story, said he had no 8500s left, and handed me an 8600. No charge.",
        "I learned two things that day: go and find it yourself, and people help those who show up."
      ],
      facts: [
        { value: 8, label: "hours each way" },
        { value: 3, label: "buses" },
        { value: 0, prefix: "₹", label: "paid for the upgrade" }
      ] },

    { year: 2010, place: "Pune, India · Hertfordshire, UK", coords: "18.52°N 73.86°E · Pune → Hertfordshire", world: "Telecom and data", tone: "#7be3a0",
      title: "Seven years learning how businesses actually run.",
      body: [
        "First job: business analyst on telecom systems, in India and then the UK. I wrote requirements, ran releases and automated the boring parts with shell scripts.",
        "Then business intelligence. I built dashboards and models that product leaders used to make real decisions, including a pricing tool that sorted through about ten thousand products.",
        "It taught me to ask what the number is for before building anything."
      ],
      facts: [
        { value: 7, label: "years as an analyst" },
        { value: 10000, prefix: "~", label: "products priced by one tool" },
        { value: 2, label: "countries" }
      ] },

    { year: 2017, place: "Dallas, Texas", coords: "32.99°N 96.75°W · Dallas, Texas", world: "Starting over", tone: "#b9a8ff",
      title: "I moved across the world to start again as a student.",
      body: [
        "A master's in business analytics at UT Dallas, and every spare hour on machine learning. I built recommenders, a neural network that invents names, and learned to put models into production.",
        "At Fiserv I built a model that recommended how much cash each ATM should hold, and then the pipeline to feed it."
      ],
      links: [
        { label: "Movie recommender", url: "https://github.com/david7joy/Recommendation_App" },
        { label: "Name generator", url: "https://github.com/david7joy/Name_Generator_Application_Tensorflow_CharRNNModel" },
        { label: "Serving models with Docker", url: "https://github.com/david7joy/tensorflow-servable-docker" }
      ] },

    { year: 2019, place: "DataStax", coords: "Distributed databases · DataStax", world: "500 demos", tone: "#ff8f88",
      title: "Five hundred demos taught me how to explain anything.",
      body: [
        "I joined DataStax and moved from building models to helping companies run data at scale. I stood in front of CIOs, CTOs and developers and showed them what was possible, live.",
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

    { year: 2022, place: "Cockroach Labs", coords: "Distributed SQL · Cockroach Labs", world: "The ecosystem", tone: "#6ee7f0",
      title: "From solutions architect to director in under four years.",
      body: [
        "I joined Cockroach Labs to work with AWS, Google Cloud and Microsoft. I wrote Terraform, built demos, co-authored guides with their engineers and presented at AWS re:Invent.",
        "Then I was asked to lead. Today my team spans three regions, and the certification program I started is a public directory of partner integrations."
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

    { year: 2025, place: "Behind the microphone", coords: "Big Ideas in App Architecture", world: "The podcast", tone: "#f59ad0",
      title: "I got a microphone and started asking better questions.",
      body: [
        "I host Big Ideas in App Architecture, where founders, CTOs and architects explain how real systems get built and what broke along the way.",
        "Guests have included Charity Majors, Joe Duffy, Peter Mattis and Spencer Kimball. It is the best education I have ever had."
      ],
      facts: [
        { value: 71, label: "episodes in the feed" }
      ],
      links: [
        { label: "The show", url: "https://www.cockroachlabs.com/big-ideas-podcast/" },
        { label: "Charity Majors", url: "https://www.spreaker.com/episode/breaking-the-pillars-rethinking-observability-with-charity-majors--70700421" },
        { label: "Spencer Kimball", url: "https://www.spreaker.com/episode/ai-market-cycles-and-the-systems-built-to-outlast-them-with-cockroach-labs-ceo-co-founder-spencer-kimball--69525858" }
      ] },

    { year: 2026, place: "Building with agents", coords: "Now · building with AI every day", world: "Agents", tone: "#6ee7f0",
      title: "Now I build for agents, with agents.",
      body: [
        "I have written code with AI tools every day for more than three years. So when coding agents arrived, my team met them where they work: plugins for Claude Code, Codex and Cursor, and a LangChain integration for agent memory.",
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
      ] }
  ],

  items: [
    /* ---------- Integrations (shipped by my team at Cockroach Labs) ---------- */
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

    /* ---------- Projects (my GitHub) ---------- */
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
    { type: "writing", featured: true, date: "2026-11-05", title: "Introducing the CockroachDB plugin for ChatGPT and Codex: Database expertise for the agentic era",
      description: "Announces the plugin that gives agents schema design, PostgreSQL migration and slow-query guidance.",
      url: "https://www.cockroachlabs.com/blog/cockroachdb-plugin-for-chatgpt-and-codex/", source: "Cockroach Labs blog", role: "Co-author", tags: ["openai", "agents"] },
    { type: "writing", date: "2025-11-18", title: "Distributed SQL + Vectors: A Match Made in Heaven",
      description: "How CockroachDB combines transactional and vector workloads in one PostgreSQL-compatible database for real-time AI applications.",
      url: "https://www.cockroachlabs.com/blog/distributed-sql-plus-vectors/", source: "Cockroach Labs blog", role: "Author", tags: ["vector", "ai"] },
    { type: "writing", date: "2024-12-20", title: "Operating CockroachDB on Microsoft Azure – Part 4",
      description: "Backups, compute and storage choices, security, data locality, performance testing and survivability planning on Azure.",
      url: "https://www.cockroachlabs.com/blog/unlocking-scale-cockroachdb-azure-part-4/", source: "Cockroach Labs blog", role: "Co-author with Microsoft", tags: ["azure", "microsoft"] },
    { type: "writing", date: "2024-11-25", title: "Hard Rock Digital Solves Data Sovereignty with CockroachDB on AWS Outposts",
      description: "How one logical database on AWS Outposts meets state-by-state sports betting data residency rules.",
      url: "https://www.cockroachlabs.com/blog/hard-rock-digital-aws-reinvent/", source: "Cockroach Labs blog", role: "Co-author", tags: ["aws", "gaming", "data residency"] },
    { type: "writing", date: "2024-11-04", title: "Operating CockroachDB on Microsoft Azure – Part 3",
      description: "Compares self-managed VMs, the hosted service and AKS, and weighs single-region against multi-region designs.",
      url: "https://www.cockroachlabs.com/blog/operating-cockroachdb-on-msft/", source: "Cockroach Labs blog", role: "Co-author with Microsoft", tags: ["azure", "microsoft"] },
    { type: "writing", date: "2024-08-20", title: "Unlocking Enterprise Scale with CockroachDB: Deploying on Microsoft Azure",
      description: "Deployment options on Azure VMs, AKS and the managed service, with command-line walkthroughs.",
      url: "https://www.cockroachlabs.com/blog/enterprise-scale-deploying-microsoft-azure/", source: "Cockroach Labs blog", role: "Co-author with Microsoft", tags: ["azure", "microsoft"] },
    { type: "writing", date: "2024-06-27", title: "Unlocking Enterprise Scale with CockroachDB on Microsoft Azure",
      description: "Opens the series on running CockroachDB on Azure for enterprise scale, resilience and performance.",
      url: "https://www.cockroachlabs.com/blog/scale-cockroachdb-on-microsoft-azure/", source: "Cockroach Labs blog", role: "Co-author with Microsoft", tags: ["azure", "microsoft"] },
    { type: "writing", date: "2024-06-10", title: "Real-time Analytics on AWS Redshift with Continuous Ingestion from CockroachDB",
      description: "Tutorial on streaming CockroachDB changefeeds to Amazon S3 and loading them continuously into Redshift.",
      url: "https://www.cockroachlabs.com/blog/real-time-analytics-on-aws-redshift/", source: "Cockroach Labs blog", role: "Co-author with AWS", tags: ["aws", "analytics", "cdc"] },
    { type: "writing", date: "2022-04-14", title: "Web3 Changes Nothing for DeFi Apps and Here's Why",
      description: "Argues that Web3 and DeFi apps still face classic scalability and availability problems.",
      url: "https://web.archive.org/web/20250619201351/https://www.datastax.com/blog/web3-changes-nothing-for-defi-apps-and-here-s-why", source: "DataStax blog (archived)", role: "Co-author", tags: ["web3", "cassandra"] },

    /* ---------- Podcast ---------- */
    { type: "podcast", featured: true, date: "2026-10-22", title: "Big Ideas in App Architecture",
      description: "The Cockroach Labs podcast I host: conversations with founders, CTOs and architects about how real systems get built.",
      url: "https://www.cockroachlabs.com/big-ideas-podcast/", source: "Cockroach Labs", role: "Host", tags: ["show", "apple podcasts", "spotify", "youtube"] },
    { type: "podcast", date: "2026-10-21", title: "Sovereignty, Scale, and the Infrastructure Behind the Bet", youtubeId: "IOEXLF9pm5c",
      description: "With Justin Cosnett, Chief Product Officer at Continent 8 Technologies.",
      url: "https://www.cockroachlabs.com/big-ideas-podcast/sovereignty-scale-and-the-infrastructure-behind-the-bet/", source: "Big Ideas in App Architecture", role: "Host", tags: ["igaming", "data sovereignty"] },
    { type: "podcast", date: "2026-09-16", title: "Introducing Cockroach Continuum",
      description: "With Tara Shankar Jana, Sr. Director of Product Marketing at Cockroach Labs.",
      url: "https://www.spreaker.com/episode/introducing-cockroach-continuum-a-big-ideas-in-app-architecture-exclusive--75155602", source: "Big Ideas in App Architecture", role: "Host" },
    { type: "podcast", date: "2026-08-19", title: "A Love Letter to the Database: Industry Shifts, Lessons Learned, and What's Next",
      description: "With Perry Krug.",
      url: "https://www.spreaker.com/episode/a-love-letter-to-the-database-industry-shifts-lessons-learned-and-what-s-next-with-perry-krug--74260113", source: "Big Ideas in App Architecture", role: "Host" },
    { type: "podcast", date: "2026-07-22", title: "The Everything Trap: Building AI Software That Lasts",
      description: "With Sam Hilsman, co-founder and CEO of CloudFruit.",
      url: "https://www.spreaker.com/episode/the-everything-trap-building-ai-software-that-lasts-with-sam-hilsman--73090854", source: "Big Ideas in App Architecture", role: "Host", tags: ["ai"] },
    { type: "podcast", date: "2026-06-17", title: "Why Inference Engineering Is the Next Big Role in AI",
      description: "With Philip Kiely of Baseten.",
      url: "https://www.spreaker.com/episode/why-inference-engineering-is-the-next-big-role-in-ai-with-philip-kiely--72554162", source: "Big Ideas in App Architecture", role: "Host", tags: ["ai", "inference"] },
    { type: "podcast", date: "2026-05-20", title: "Distributed Systems, Linkerd, and the Cost of Network Calls",
      description: "With William Morgan, co-founder and CEO of Buoyant.",
      url: "https://www.spreaker.com/episode/distributed-systems-linkerd-and-the-cost-of-network-calls-with-william-morgan-from-buoyant--72073153", source: "Big Ideas in App Architecture", role: "Host" },
    { type: "podcast", date: "2026-04-15", title: "Making Software as Durable as Data",
      description: "With Peter Kraft, co-founder of DBOS.",
      url: "https://www.spreaker.com/episode/making-software-as-durable-as-data-with-peter-kraft-from-dbos--71328358", source: "Big Ideas in App Architecture", role: "Host" },
    { type: "podcast", date: "2026-03-18", title: "Breaking the Pillars: Rethinking Observability",
      description: "With Charity Majors, co-founder and CTO of Honeycomb.",
      url: "https://www.spreaker.com/episode/breaking-the-pillars-rethinking-observability-with-charity-majors--70700421", source: "Big Ideas in App Architecture", role: "Host", tags: ["observability"] },
    { type: "podcast", date: "2026-02-18", title: "How to Transform Dev Workflows with CI/CS and AI Agents",
      description: "With software architect Tomer Karin.",
      url: "https://www.spreaker.com/episode/how-to-transform-dev-workflows-with-ci-cs-and-ai-agents-with-tomer-karin--70109819", source: "Big Ideas in App Architecture", role: "Host", tags: ["ai", "agents"] },
    { type: "podcast", date: "2026-01-21", title: "AI, Market Cycles, and the Systems Built to Outlast Them",
      description: "With Spencer Kimball, CEO and co-founder of Cockroach Labs.",
      url: "https://www.spreaker.com/episode/ai-market-cycles-and-the-systems-built-to-outlast-them-with-cockroach-labs-ceo-co-founder-spencer-kimball--69525858", source: "Big Ideas in App Architecture", role: "Host", tags: ["ai"] },
    { type: "podcast", date: "2025-05-13", title: "How to Build an AI-Native Organization",
      description: "With Peter Mattis, co-founder, CTO and CPO of Cockroach Labs.",
      url: "https://www.spreaker.com/episode/how-to-build-an-ai-native-organization--66071422", source: "Big Ideas in App Architecture", role: "Host", tags: ["ai"] },
    { type: "podcast", date: "2025-02-11", title: "Inside Infrastructure as Code with Pulumi's Founder & CEO",
      description: "With Joe Duffy of Pulumi.",
      url: "https://www.spreaker.com/episode/inside-infrastructure-as-code-with-pulumi-s-founder-ceo--64322192", source: "Big Ideas in App Architecture", role: "Host" },

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
      description: "Upcoming webinar with Rob Reid: failover without double charges, serializable spend limits and keeping fraud reads off the spend path.",
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
