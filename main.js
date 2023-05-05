const express = require("express");
const { Pool } = require("pg");
const app = express();
const port = 3000;

const pool = new Pool({
  user: "ukd_admin",
  host: "ep-square-mouse-262994.us-west-2.aws.neon.tech",
  database: "ukd",
  password: "YyfeQqL0W8uS",
  port: 5432,
});

app.use(express.json());

app.post("/students", async (req, res) => {
  const { name, age, email } = req.body;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const insertStudentText =
      "INSERT INTO students(name, age, email) VALUES($1, $2, $3) RETURNING id";
    const insertStudentValues = [name, age, email];
    const {
      rows: [{ id }],
    } = await client.query(insertStudentText, insertStudentValues);
    await client.query("COMMIT");
    res.json({ id, name, age, email });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).send("Internal server error");
  } finally {
    client.release();
  }
});

app.post("/tasks", async (req, res) => {
  const { studentId, subjectId, taskName } = req.body;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const insertTaskText =
      "INSERT INTO tasks(student_id, subject_id, name) VALUES($1, $2, $3) RETURNING id";
    const insertTaskValues = [studentId, subjectId, taskName];
    const {
      rows: [{ id }],
    } = await client.query(insertTaskText, insertTaskValues);
    await client.query("COMMIT");
    res.json({ id, studentId, subjectId, taskName });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).send("Internal server error");
  } finally {
    client.release();
  }
});

app.get("/students-tasks", async (req, res) => {
  const client = await pool.connect();
  try {
    const studentsQuery = `
      SELECT s.id, s.name, s.age, s.email, json_agg(json_build_object('id', t.id, 'name', t.name, 'subject_id', t.subject_id)) as tasks
      FROM students s
      LEFT JOIN tasks t ON s.id = t.student_id
      GROUP BY s.id
    `;
    const { rows: students } = await client.query(studentsQuery);
    res.json(students);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).send("Internal server error");
  } finally {
    client.release();
  }
});

app.get("/subjects/:id", (req, res) => {
  const subjectId = req.params.id;

  pool.query(
    "SELECT * FROM subjects WHERE id = $1",
    [subjectId],
    (error, results) => {
      if (error) {
        throw error;
      }
      if (results.rows.length === 0) {
        res.status(404).send("Subject not found");
        return;
      }
      const subject = results.rows[0];
      pool.query(
        "SELECT * FROM tasks WHERE subject_id = $1",
        [subjectId],
        (error, results) => {
          if (error) {
            throw error;
          }
          const tasks = results.rows;
          const data = {
            id: subject.id,
            name: subject.name,
            tasks: tasks.map((task) => ({
              id: task.id,
              description: task.description,
              student_id: task.student_id,
            })),
          };
          res.json(data);
        }
      );
    }
  );
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
