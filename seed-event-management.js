require("dotenv").config();
const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;
const dbName = "event_management";

if (!uri) {
    console.error("MONGODB_URI is missing from .env");
    process.exit(1);
}

const client = new MongoClient(uri);

const names = [
    "Aditya Sharma", "Rahul Kumar", "Priya Reddy", "Ananya Singh",
    "Arjun Rao", "Sneha Patel", "Karthik Reddy", "Neha Gupta",
    "Vikram Das", "Ishita Nair", "Rohan Mehta", "Pooja Verma",
    "Aman Khan", "Divya Iyer", "Sahil Jain", "Meera Shah",
    "Nikhil Rao", "Kavya Menon", "Varun Gupta", "Riya Das",
    "Akash Patel", "Anjali Rao", "Manoj Kumar", "Sanya Singh",
    "Harsh Verma", "Tanvi Shah", "Ritesh Nair", "Shreya Gupta",
    "Yash Raj", "Aarav Menon"
];

const departments = ["CSE", "ECE", "IT", "AIML", "EEE"];
const statuses = ["Active", "Inactive", "Pending"];
const eventStatuses = ["Planned", "Active", "Completed", "Pending"];
const taskStatuses = ["Pending", "In Progress", "Completed"];
const priorities = ["Low", "Medium", "High"];

const eventNames = [
    "Tech Fest 2026",
    "Hackathon 2026",
    "AI Workshop",
    "Web Development Bootcamp",
    "Coding Contest",
    "Cloud Computing Seminar",
    "Cybersecurity Workshop",
    "Sports Meet",
    "Cultural Fest",
    "Innovation Expo",
    "Data Science Summit",
    "Project Expo"
];

function pick(arr, i) {
    return arr[i % arr.length];
}

function futureDate(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(10 + (days % 6), 0, 0, 0);
    return d;
}

function pastDate(days) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    d.setHours(10 + (days % 6), 0, 0, 0);
    return d;
}

async function seed() {
    await client.connect();

    const db = client.db(dbName);

    const collections = [
        "members",
        "teams",
        "events",
        "projects",
        "tasks",
        "finances",
        "feedbacks",
        "attendance"
    ];

    for (const name of collections) {
        await db.createCollection(name).catch(() => { });
        await db.collection(name).deleteMany({});
    }

    const teams = Array.from({ length: 6 }, (_, i) => ({
        team_id: `TEAM${String(i + 1).padStart(3, "0")}`,
        name: [
            "Development",
            "Design",
            "Marketing",
            "Operations",
            "Research",
            "Events"
        ][i],
        description: `Team responsible for ${[
                "software development",
                "design",
                "marketing",
                "operations",
                "research",
                "event management"
            ][i]
            }.`,
        head_id: `MEM${String((i % 6) + 1).padStart(3, "0")}`,
        members_count: 5,
        budget: 10000 + i * 2500,
        created_at: pastDate(60 - i * 5),
        updated_at: new Date()
    }));

    const members = names.map((name, i) => ({
        member_id: `MEM${String(i + 1).padStart(3, "0")}`,
        name,
        roll_no: `23BCE${String(1001 + i).padStart(4, "0")}`,
        department: pick(departments, i),
        contact_no: `98${String(10000000 + i * 137).padStart(8, "0")}`,
        email: `${name.toLowerCase().replace(/[^a-z]/g, ".")}@example.com`,
        team_id: pick(teams, i).team_id,
        role_id: i < 6 ? "TEAM_HEAD" : "MEMBER",
        status: i % 10 === 0 ? "Inactive" : "Active",
        created_at: pastDate(45 - (i % 30)),
        updated_at: new Date()
    }));

    const events = eventNames.map((name, i) => ({
        event_id: `EVT${String(i + 1).padStart(3, "0")}`,
        name,
        date: futureDate(i * 4 + 2),
        venue: [
            "Main Auditorium",
            "Innovation Lab",
            "Seminar Hall",
            "Sports Ground"
        ][i % 4],
        team_id: pick(teams, i).team_id,
        collaborations:
            i % 3 === 0
                ? ["Industry Partner", "Student Club"]
                : ["Student Club"],
        budget: 15000 + i * 3500,
        status: pick(eventStatuses, i),
        created_at: pastDate(25 - (i % 20)),
        updated_at: new Date()
    }));

    const projects = Array.from({ length: 10 }, (_, i) => ({
        project_id: `PRJ${String(i + 1).padStart(3, "0")}`,
        name: [
            "Campus Event Portal",
            "Smart Attendance System",
            "Student Analytics",
            "Digital Library",
            "AI Helpdesk",
            "Event Recommendation System",
            "Task Management Portal",
            "Finance Tracker",
            "Feedback Analytics",
            "Club Management"
        ][i],
        description:
            "Project developed for organizational and event management activities.",
        status: pick(["Pending", "In Progress", "Completed"], i),
        team_id: pick(teams, i).team_id,
        start_date: pastDate(50 - i * 2),
        end_date: futureDate(20 + i * 3),
        created_at: pastDate(40 - i),
        updated_at: new Date()
    }));

    const tasks = Array.from({ length: 40 }, (_, i) => ({
        task_id: `TSK${String(i + 1).padStart(3, "0")}`,
        task_name: [
            "Prepare registration form",
            "Design event poster",
            "Configure MongoDB",
            "Prepare presentation",
            "Contact sponsors",
            "Update website",
            "Prepare attendance sheet",
            "Analyze feedback"
        ][i % 8],
        description: "Task assigned to a project team member.",
        assigned_to: members[i % members.length].member_id,
        status: pick(taskStatuses, i),
        priority: pick(priorities, i),
        due_date: futureDate(i % 25),
        project_id: projects[i % projects.length].project_id,
        created_at: pastDate(i % 30),
        updated_at: new Date()
    }));

    const finances = Array.from({ length: 25 }, (_, i) => ({
        finance_id: `FIN${String(i + 1).padStart(3, "0")}`,
        event_id: events[i % events.length].event_id,
        amount: 1000 + i * 750,
        type: i % 4 === 0 ? "Income" : "Expense",
        description:
            i % 4 === 0
                ? "Event sponsorship"
                : "Event operational expense",
        date: pastDate(i % 30),
        category: [
            "Venue",
            "Food",
            "Marketing",
            "Equipment",
            "Sponsorship"
        ][i % 5],
        created_at: pastDate(i % 30),
        updated_at: new Date()
    }));

    const attendance = Array.from({ length: 60 }, (_, i) => ({
        attendance_id: `ATT${String(i + 1).padStart(3, "0")}`,
        member_id: members[i % members.length].member_id,
        event_id: events[i % events.length].event_id,
        status: i % 5 === 0 ? "Absent" : "Present",
        check_in_time: pastDate(i % 20),
        created_at: pastDate(i % 20),
        updated_at: new Date()
    }));

    const feedbacks = Array.from({ length: 30 }, (_, i) => ({
        feedback_id: `FDB${String(i + 1).padStart(3, "0")}`,
        member_id: members[i % members.length].member_id,
        event_id: events[i % events.length].event_id,
        comments: [
            "Very informative event.",
            "Well organized.",
            "Good experience.",
            "Could improve the venue.",
            "Excellent session."
        ][i % 5],
        rating: 3 + (i % 3),
        date: pastDate(i % 30),
        created_at: pastDate(i % 30),
        updated_at: new Date()
    }));

    await db.collection("teams").insertMany(teams);
    await db.collection("members").insertMany(members);
    await db.collection("events").insertMany(events);
    await db.collection("projects").insertMany(projects);
    await db.collection("tasks").insertMany(tasks);
    await db.collection("finances").insertMany(finances);
    await db.collection("attendance").insertMany(attendance);
    await db.collection("feedbacks").insertMany(feedbacks);

    await db.collection("members").createIndex(
        { email: 1 },
        { unique: true }
    );

    await db.collection("members").createIndex({
        department: 1,
        status: 1
    });

    await db.collection("events").createIndex({
        date: 1
    });

    await db.collection("events").createIndex({
        team_id: 1,
        status: 1
    });

    await db.collection("tasks").createIndex({
        assigned_to: 1,
        status: 1
    });

    await db.collection("finances").createIndex({
        event_id: 1,
        date: 1
    });

    await db.collection("attendance").createIndex({
        member_id: 1,
        event_id: 1
    });

    await db.collection("feedbacks").createIndex({
        event_id: 1,
        rating: -1
    });

    console.log("\nSeed completed successfully!");
    console.log("Database:", dbName);

    for (const name of collections) {
        console.log(
            `- ${name}: ${await db.collection(name).countDocuments()}`
        );
    }

    console.log("\nIndexes created successfully.");
}

seed()
    .catch((err) => {
        console.error("\nSeed failed:", err);
        process.exitCode = 1;
    })
    .finally(async () => {
        await client.close();
    });

