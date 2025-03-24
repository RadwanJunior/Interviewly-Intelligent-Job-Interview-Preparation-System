from supabase_service import SupabaseService
from google import genai 
import os
import json

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

MODEL = "gemini-2.0-flash"

PROMPT_TEMPLATE = """You are an expert HR interviewer and career coach. Based on the candidate's resume, job details, and company context, generate a structured list of interview questions that assess:

1. **Behavioral and General Fit Questions** (first): 
   - Start with common behavioral interview questions such as "Tell me about yourself."
   - Include questions about teamwork, leadership, problem-solving, and career motivation.
   - Ensure questions assess soft skills, communication, and company culture fit.

2. **Technical Questions** (second): 
   - Ask in-depth technical questions based on the job description and candidate’s experience.
   - Include problem-solving and debugging questions related to key technologies or skills.

3. **Situational & Case-Based Questions** (last): 
   - Ask scenario-based questions that evaluate decision-making and real-world problem-solving.
   - Present hypothetical challenges related to the job role and industry.

Please output the questions in **JSON format** as an array, where each element is an object with a `"question"` field. Do **not** include additional text, explanations, or code block formatting. **Strictly return only valid JSON.**

{{
  "resume": "{resume}",
  "job_title": "{job_title}",
  "job_description": "{job_description}",
  "company_name": "{company_name}",
  "location": "{location}"
}}

"""

class InterviewService:
    @staticmethod
    def generate_questions(resume_text: str, job_title: str, job_description: str, company_name: str, location: str) -> list:
        """
        Generates interview questions based on the resume text, job title, job description, company name, and location.
        """
        # Format the prompt with the provided variables
        prompt = PROMPT_TEMPLATE.format(
            resume=resume_text,
            job_title=job_title,
            job_description=job_description,
            company_name=company_name,
            location=location
        )

        # Count tokens using the new client method.
        total_tokens = client.models.count_tokens(
            model="gemini-2.0-flash", contents=prompt
        )
        print("Total tokens:", total_tokens)

        try:
            # Generate questions
            response = client.models.generate_content(
                model=MODEL,
                contents=[{"role": "user", "parts": [{"text": prompt}]}],
                # config={"max_tokens": 700, "top_p": 0.90, "temperature": 0.8},
            )

            print("Response:", response)

            # Extract text response
            if response and response.candidates:
                raw_text = response.candidates[0].content.parts[0].text
                print("Raw Text:", raw_text)

                # remove code bloack markers
                if raw_text.startswith("```json"):
                    raw_text = raw_text[7:]
                if raw_text.endswith("```"):
                    raw_text = raw_text[:-3]

                print("Processed Text:", raw_text)
                
                questions = json.loads(raw_text)
                return questions
        except Exception as e:
            print("Error generating questions:", str(e))
            return []

    
# test the class
if __name__ == "__main__": 
    resume_text = """
Marwan Mashaly
marwanmashaly@gmail.com | (343) 202-3837 | linkedin.com/in/marwan -mashaly | github.com/MarwanMashaly1
EDUCATION
University of Ottawa, Bachelor of Applied Science in Software Engineering, Ottawa, ON Sept. 2021 – Dec. 2025
• Dean’s List: Winter 2024, Summer 2023, Winter 2023, Fall 2022, and Fall 2021
• Relevant Courses: Computer Architecture; Data Structures and Algorithms; Design and Analysis of Algorithms; Operating Systems;
Introduction to AI, Data Communication and Networking, Real Time Embedded Systems, Software Construction
EXPERIENCE
Avionics Team member, uOttawa Rocket Team Oct. 2021 – Present
• Led development of control software for a liquid engine system using an Arduino PLC, improving automation and reliability, reducing
manual intervention by 50%.
• Integrated LabJack with C++ for real-time data acquisition, enabling continuous system monitoring.
• Designed a modular ground station using Rust and TypeScript, optimizing telemetry tracking and radio communication.
• Developed a GraphQL API layer using Hasura, allowing seamless integration between telemetry data and the web app, enhancing real-
time monitoring capabilities and improving data accessibility for team members.
• Created a dynamic drag coefficient plugin for OpenRocket, an open-source rocketry simulation tool, significantly improving flight
simulation accuracy.
Aircraft Software Specialist Intern, CAE May 2024 – Aug. 2024
• Enhanced the aircraft alerting system (EICAS) using C, integrating support for the latest display systems and incorporating over 60 new
alert messages.
• Implemented ARINC message decoding by updating input/output buses to process data from the graphics display unit, ensuring accurate
message display based on system conditions.
• Resolved over 10 software bugs across multiple airline configurations, boosting system reliability by 20%.
• Conducted manual lab testing, ensuring 100% compatibility between simulated and real-world aircraft systems.
Software Engineering Intern, Solace Sept. 2023 – Dec. 2023
• Designed a JavaScript API feature with browser and server-side support for message compression, reducing bandwidth usage by 45%.
• Led architecture planning of message compression feature, breaking feature into 5+ user stories, completing 2 weeks ahead of schedule.
• Implemented rigorous testing, establishing a comprehensive suite with 15+ tests to ensure reliability and performance.
• Maintained and improved a custom Wireshark dissector to capture and decode messages, enhancing efficiency and usability.
Full Stack Engineering Intern, Cision Jan. 2023 – Apr. 2023
• Developed Java Spring Boot backend microservices to monitor microservices health and status, using RESTful APIs.
• Managed 3 different Microsoft SQL and PostgreSQL databases, implementing multi-database setups with Spring Boot.
• Migrated legacy system to modern architectures, improving system efficiency and scalability while managing 1M+ users.
• Enhanced operational efficiency by deploying 2 microservices onto Docker containers and orchestrating deployments with Kubernetes.
Software Engineering Intern, Ford May 2022 – Aug. 2022
• Created a Java plugin that automates code-to-UML translation, improving development efficiency by 30% and used by 100+ developers.
• Designed AUTOSAR-compliant software for vehicle infotainment systems enhancing modularity and compliance.
• Implemented a device identity checker using C++ in vehicle software and tested deployment on QNX hypervisor with docker images.
PERSONAL PROJECTS
SalamCity | React.js, Python, MySQL
• Developed a city-wide event aggregator using React.js and Flask with web scraping and an LLM API to categorize and display events.
• Automated event sharing through various bots, which posts new events from the database to over 1000+ users.
HealthScribe – Hackathon | React.js, Node.js, Groq, SQLite
• Developed an AI powered full-stack health scribing software to help doctors take notes during patient visits.
• Integrated Whisper for transcription and GPT for SOAP notes generation, reducing manual documentation time by 60%.
• Implemented Node.js + SQLite for user management, enabling doctors to organize patient visit histories efficiently.
Autonomous Vehicle | Arduino
• Built an autonomous ultrasound vehicle using Arduino, using sensors to detect and avoid obstacles in its path.
SKILLS
• Programming Languages: Java, Python, Rust, C/C++, Go, Kotlin, JavaScript, TypeScript, SQL, HTML/CSS
• Frameworks: React Native, React.js, Remix, Angular, Svelte, Node.js, PostgreSQL, Microsoft SQL, Flask, Zero MQ, Rabbit MQ,
Kubernetes, pandas, NumPy, JUnit, Material-UI, Tailwind CSS, GraphQL
• Tools: Linux, Git, Docker, AWS, GCP, VS Code, IntelliJ, GitHub Actions, Raspberry Pi, Arduino, Jira, JMP
Kafka, Haskell, Scala,, , frontend, code review, full stack, communication skills, problem-solving"""
    job_title = "Software Engineer"
    job_description = """About the job
Woven by Toyota is the mobility technology subsidiary of Toyota Motor Corporation. Our mission is to deliver safe, intelligent, human-centered mobility for all. Through our Arene mobility software platform, safety-first automated driving technology and Toyota Woven City — our test course for advanced mobility — we’re bringing greater freedom, safety and happiness to people and society.

Our unique global culture weaves modern Silicon Valley innovation and time-tested Japanese quality craftsmanship. We leverage these complementary strengths to amplify the capabilities of drivers, foster happiness, and elevate well-being.

TEAM

Arene’s goal is to open vehicle programming to everyone by simplifying vehicle software development and increasing deployment frequency without compromising safety and security. This will create a whole new market of vehicle application developers who, through software, integrate a vehicle into our daily lives in novel ways. Arene aims to significantly improve how vehicles are designed and developed, and we’re working closely with Toyota to realize this goal in its next-generation vehicles.

You will be a part of the Arene SDK team. The Arene SDK team is responsible for designing and building frameworks for state-of-the-art mobility in vehicles. This includes middleware components such as scheduling for real-time systems, inter-process communication, and operating system abstractions.

WHO ARE WE LOOKING FOR?

The ideal candidate for this role comes from a generalist software engineering background. This individual would have experience working with modern C++, Linux O.S. or Real-Time Operating Systems, and system software.

We are looking for software engineers who are excited to help build a state-of-the-art automotive platform that is “software first”. We envision the Arene platform will change the way vehicles are made. Our team is developing tools and systems using modern software techniques, and we need software engineers who excel at building robust software systems to solve challenging problems at scale.

Responsibilities

Design and build frameworks and tools for state-of-the-art mobility in vehicles. This includes middleware components such as scheduling for real-time systems, inter-process communication, and operating system abstractions. 
The academic objectives for the internship period are two-fold. First, the student has a goal to improve their system architecture design skills for state-of-the-art mobility in vehicle systems. Second, the student has a goal to acquire hands-on capability to solve practical engineering problems in a real industry setup. The student will gain knowledge of system design and software engineering skills during this internship. 
Develop solutions for software to be run in a CI test environment, with a strong emphasis on automation to prevent regressions. 
Write clear and comprehensive documents including: proposals, specifications, design documentation, user documentation, tutorials, and post mortems. 

Minimum Qualifications

Modern C++ programming and working knowledge of at least one scripting language like Python, Bash, JavaScript, or Ruby
Strong background in object oriented programming and writing reusable C++ code
Ability to evaluate approaches and choose the best one based on fundamental qualities and supporting data
Good communication skills. Ability to explain technical concepts through design documents and reviews

NICE TO HAVES

Familiarity with Android Automotive, Android Auto or Android framework
Knowledge and/or experience working with different sensors - camera, lidar, gnss
Knowledge and/or experience in ROS, vehicle autonomy stack
Insight into real-time, distributed, parallel computing, and low-level hardware
Familiarity with automotive or embedded processor architectures (ARM/x86)
Developing an in-vehicle display and control system, or an instrument cluster

Our Commitment

・We are an equal opportunity employer and value diversity.

・Any information we receive from you will be used only in the hiring and onboarding process. Please see our privacy notice for more details."""
    company_name = "Woven Toyota"
    location = "San Francisco, CA"

    questions = InterviewService.generate_questions(resume_text, job_title, job_description, company_name, location)
    print("Generated Questions:", questions)