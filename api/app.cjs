const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");
var crypto = require("crypto");
const axios = require('axios');
const credentials = require("./key.json");
const fetch = require('node-fetch');


// Databases: student_active, student_pending, educator, admin, courses, degree_programs

admin.initializeApp({
  credential: admin.credential.cert(credentials),
});
const db = admin.firestore();

const app = express();
app.use(cors());

/*
Endpoint: get all student information
app.get("/student_active/:id")
JSON response: {studentId: "studentId", firstName: "firstName", lastName: "lastName", courses: ["courseId1", "courseId2", ...]}
*/
app.get("/student_active/:id", async (req, res) => {
  try {
    const studentId = req.params.id;

    // Get the student's document from the Firestore database
    const studentDoc = db.collection("student_active").doc(studentId);
    const studentSnapshot = await studentDoc.get();

    if (!studentSnapshot.exists) {
      return res.status(404).send("Student not found");
    }

    const studentData = studentSnapshot.data();
    res.status(200).json(studentData);
  } catch (error) {
    // Send an error response
    res.status(500).send(error.message);
  }
});
/*
Endpoint: add a course to a student's active courses
app.put("/student_active/add/courses")
JSON request: {studentId: "studentId", courseId: "courseId"}
*/
app.put("/student_active/add/courses", express.json(), async (req, res) => {
  try {
    // Check if studentId is present in the request body
    if (!req.body) {
      return res
        .status(400)
        .send("Missing studentId, course, or grade in the request body");
    }

    const studentId = req.body.studentId;
    const courseToAdd = req.body.courseToAdd;

    // Get the student's document from the Firestore database
    const studentDoc = db.collection("student_active").doc(studentId);

    // Check if the student document exists
    const studentSnapshot = await studentDoc.get();
    if (!studentSnapshot.exists) {
      return res.status(404).send("Student not found");
    }

    // Append the new course and grade to the courses array
    const studentData = studentSnapshot.data();
    const courses = studentData.courses || [];
    courses.push(courseToAdd);

    // Update the student document with the updated courses array
    await studentDoc.update({
      courses: courses,
    });

    // Send a success response
    res.status(200).send("Course and grade added successfully");
  } catch (error) {
    // Send an error response
    res.status(500).send(error.message);
  }
});

/*
Endpoint: remove a course from a student's active courses
app.put("/student_active/delete/courses")
JSON request: {studentId: "studentId", courseId: "courseId"}
*/
app.delete("/student_active/:studentId/course/:courseId", async (req, res) => {
  try {
    const studentId = req.params.studentId;
    const courseId = req.params.courseId;
    const studentRef = db.collection("student_active").doc(studentId);
    await studentRef.update({
      courses: admin.firestore.FieldValue.arrayRemove(courseId),
    });
    res.send("Course removed successfully.");
  } catch (error) {
    res.status(500).send(error);
  }
});

/*
Endpoint: get all pending students
app.get("/get_all_pending_students")
JSON response: [{studentId: "studentId", firstName: "firstName", lastName: "lastName"}, ...]
*/
app.get("/get_all_pending_students", async (req, res) => {
  try {
    // Get all pending students from the Firestore database
    const pendingStudentsRef = db.collection("student_pending");
    const pendingStudentsSnapshot = await pendingStudentsRef.get();

    // Create an array of pending students
    const pendingStudents = [];
    pendingStudentsSnapshot.forEach((doc) => {
      pendingStudents.push(doc.data());
    });

    // Send a success response
    res.status(200).json(pendingStudents);
  } catch (error) {
    // Send an error response
    res.status(500).send(error.message);
  }
});

/*
Endpoint: get all active students
app.get("/get_all_active_students")
JSON response: [{studentId: "studentId", firstName: "firstName", lastName: "lastName"}, ...]
*/
app.get("/get_all_active_students", async (req, res) => {
  try {
    // Get all active students from the Firestore database
    const activeStudentsRef = db.collection("student_active");
    const activeStudentsSnapshot = await activeStudentsRef.get();

    // Create an array of active students
    const activeStudents = [];
    activeStudentsSnapshot.forEach((doc) => {
      activeStudents.push(doc.data());
    });

    // Send a success response
    res.status(200).json(activeStudents);
  } catch (error) {
    // Send an error response
    res.status(500).send(error.message);
  }
});

/*
Endpoint: upgrade a pending student to an active student
app.post("/upgrade_student")
JSON request: {studentId: "studentId"}
*/

app.post("/upgrade_student", express.json(), async (req, res) => {
  try {
    // Check if studentId is present in the request body
    if (!req.body) {
      return res.status(400).send("Missing the request body");
    }

    const studentId = req.body.studentId;

    // Get the student's document from the Firestore database
    const studentDoc = db.collection("student_pending").doc(studentId);

    // Check if the student document exists
    const studentSnapshot = await studentDoc.get();
    if (!studentSnapshot.exists) {
      return res.status(404).send("Student not found");
    }

    // Get the student data
    const studentData = studentSnapshot.data();

    // Create a new student document in the active students collection
    await db.collection("student_active").doc(studentId).set(studentData);

    // Delete the student document from the pending students collection
    await studentDoc.delete();

    // Send a success response
    res.status(200).send("Student upgraded successfully");
  } catch (error) {
    // Send an error response
    res.status(500).send(error.message);
  }
});

/*
Endpoint: create a new course
app.post("/create_course")
JSON request:
{
  courseId: "courseId",
  courseName: "courseName",
  courseDescription: "courseDescription",
  courseCredits: "courseCredits",
}
*/
app.post("/create_course", express.json(), async (req, res) => {
  try {
    // Check if courseId, courseName, courseDescription, and courseCredits are present in the request body
    if (
      !req.body.courseId ||
      !req.body.courseName ||
      !req.body.courseDescription ||
      !req.body.courseCredits
    ) {
      return res
        .status(400)
        .send(
          "Missing courseId, courseName, courseDescription, or courseCredits in the request body"
        );
    }

    const courseId = req.body.courseId;
    const courseName = req.body.courseName;
    const courseDescription = req.body.courseDescription;
    const courseCredits = req.body.courseCredits;

    // Create a new course document in the courses collection
    await db.collection("courses").doc(courseId).set({
      courseName: courseName,
      courseDescription: courseDescription,
      courseCredits: courseCredits,
    });

    // Send a success response
    res.status(200).send("Course created successfully");
  } catch (error) {
    // Send an error response
    res.status(500).send(error.message);
  }
});

/*
Endpoint: get all courses
app.get("/get_all_courses")
JSON response: [{courseId: "courseId", courseName: "courseName", courseDescription: "courseDescription", courseCredits: "courseCredits"}, ...]
*/
app.get("/get_all_courses", async (req, res) => {
  try {
    // Get all courses from the Firestore database
    const coursesRef = db.collection("Courses");
    const coursesSnapshot = await coursesRef.get();

    // Create an array of courses
    const courses = [];
    coursesSnapshot.forEach((doc) => {
      courses.push(doc.data());
    });

    // Send a success response
    res.status(200).json(courses);
  } catch (error) {
    // Send an error response
    res.status(500).send(error.message);
  }
});

/*
Endpoint: get all professors
app.get("/get_all_professors")
JSON response:
[
  {
    professorId: "professorId",
    firstName: "firstName",
    lastName: "lastName",
    coursesEnrolled: ["courseId1", "courseId2", ...]
  },
  ...
]
*/
app.get("/get_all_professors", async (req, res) => {
  try {
    // Get all professors from the Firestore database
    const professorsRef = db.collection("professors");
    const professorsSnapshot = await professorsRef.get();

    // Create an array of professors
    const professors = [];
    professorsSnapshot.forEach((doc) => {
      professors.push(doc.data());
    });

    // Send a success response
    res.status(200).json(professors);
  } catch (error) {
    // Send an error response
    res.status(500).send(error.message);
  }
});

/*
Endpoint: get all programs (degrees)
app.get("/get_all_programs")
JSON response: 
[
  {
    programId: "programId",
    programName: "programName",
    programDescription: "programDescription",
    programCredits: "programCredits",
    programCourses: ["courseId1", "courseId2", ...]
  },
  ...
]
*/
app.get("/get_all_programs", async (req, res) => {
  try {
    // Get all programs from the Firestore database
    const programsRef = db.collection("programs");
    const programsSnapshot = await programsRef.get();

    // Create an array of programs
    const programs = [];
    programsSnapshot.forEach((doc) => {
      programs.push(doc.data());
    });

    // Send a success response
    res.status(200).json(programs);
  } catch (error) {
    // Send an error response
    res.status(500).send(error.message);
  }
});


/*
Endpoint: endpoint to update a student's active courses interest 
app.put("/student_active/update_interest/courses")
JSON request: {studentId: "studentId", courseId: "courseId"}
*/
app.put("/student_active/update_interest/courses", express.json(), async (req, res) => {
  try {
    // Check if studentId is present in the request body
    if (!req.body) {
      return res
        .status(400)
        .send("Missing studentId, course, or grade in the request body");
    }

    const studentId = req.body.studentId;
    const new_interest = req.body.interest;

    // Get the student's document from the Firestore database
    const studentDoc = db.collection("student_active").doc(studentId);

    // Check if the student document exists
    const studentSnapshot = await studentDoc.get();
    if (!studentSnapshot.exists) {
      return res.status(404).send("Student not found");
    }

    // Append the new course and grade to the courses array
    const studentData = studentSnapshot.data();


    // Update the student document with the updated courses array
    await studentDoc.update({
      interest: new_interest, 
    });

    // Send a success response
    res.status(200).send("Interest updated successfully");
  } catch (error) {
    // Send an error response
    res.status(500).send(error.message);
  }
});


// this is ML recommender system 
const createEmbeddings = async ({ token, model, input }) => {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    method: 'POST',
    body: JSON.stringify({ input, model }),
  });

  const { error, data, usage } = await response.json();

  return data;
};


  // https://stackoverflow.com/questions/51362252/javascript-cosine-similarity-function
  function calculateCosineSimilarity(A, B) {
    var dotproduct = 0;
    var mA = 0;
    var mB = 0;

    for(var i = 0; i < A.length; i++) {
        dotproduct += A[i] * B[i];
        mA += A[i] * A[i];
        mB += B[i] * B[i];
    }

    mA = Math.sqrt(mA);
    mB = Math.sqrt(mB);
    var similarity = dotproduct / (mA * mB);

    return similarity;
};

app.get('/recommender/system/:id', async (req, res) => {
  const studentId = req.params.id;
  let index = 0;
  const courses_percentage = [];

  try {
    const link = "http://localhost:3100/student_active/" + studentId;
    const response = await axios.get(link);
    const text = response.data['interest'];
    const vector = await createEmbeddings({
      token: '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',
      model: 'text-embedding-ada-002',
      input: text,
    });
// the pipeline has been developed and waiting to be pushed .

    const response2 = await axios.get("http://localhost:3100/get_all_courses");

    for (let i = 0; i < response2.data.length; i++) {
      const text = response2.data[i].courseDescription;
      const vector2 = await createEmbeddings({
        token: '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',
        model: 'text-embedding-ada-002',
        input: text,
      });

      // Calculate the cosine similarity between data and course vector
      const similarity = calculateCosineSimilarity(vector[0].embedding, vector2[0].embedding);

      if (similarity > 0.8) {
        courses_percentage.push({
          courseName: response2.data[i]['courseName'],
          courseCredits: response2.data[i]['courseCredits'],
          numStudents: response2.data[i]['numStudents'],
          courseDescription: response2.data[i]['courseDescription'],
          similarity: similarity,
        });
        index = index + 1;
      }
    }

    res.json(courses_percentage);
  } catch (error) {
    // Handle any errors
    console.error(error);
    res.status(500).json({ error: 'Internal request failed' });
  }
});

const server = app.listen(process.env.PORT || 3100, () => {
  console.log("http://localhost:3100/");
});
