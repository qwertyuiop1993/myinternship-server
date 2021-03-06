// stuff for testing basic routing
const request = require("supertest");
const { app, server } = require("./../index.js");
const agent = request.agent(app); // set up agent for session testing
const admin = request.agent(app);

// stuff for testing database
const User = require("../models/user.js");
const Admin = require("../models/admin.js");
const { users, populateUsers, admins, populateAdmins } = require("./seed/seed.js");

beforeEach(populateUsers);
// beforeEach(populateAdmins);
beforeEach((done) => {
  // clear admins and then create new admin
  Admin.deleteMany({}).then(() => {
    admin
      .post("/auth/admin/signup")
      .send(admins)
      .expect(200)
      .end((err, res) => {
        Admin.findOne({ username: "admin" })
          .then((admin) => {
            expect(admin).toBeTruthy();
            expect(admin.username).toBe("admin");
            done();
          })
          .catch((err) => done(err));
      });
  });
});

// Student routes

describe("POST auth/signup", () => {
  it("should save a new user and respond with 200 and the user", (done) => {
    request(app)
      .post("/auth/signup")
      .send({
        institutionCode: "just",
        studentid: "123456",
        name: "David",
        password: "sdgasgage",
        department: "Trade"
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.studentid).toBe("123456");
        expect(res.body.name).toBe("David");
        expect(res.body.password).toBeFalsy(); // should be no password sent
        expect(res.body.department).toBe("Trade");
      })
      .end((err, res) => {
        if (err) {
          done(err);
        }

        User.findOne({ _id: res.body._id })
          .then((user) => {

            console.log('user', user)
            expect(user.studentid).toBe("123456");
            expect(user.name).toBe("David");
            expect(user.department).toBe("Trade");
            done();
          })
          .catch((err) => done(err));
      });
  });

  it("should not allow signup if incorrect institutionCode supplied", (done) => {
    request(app)
      .post("/auth/signup")
      .send({ institutionCode: "d", studentid: "123456", name: "David", password: "sdgasgage", department: "Trade" })
      .expect(404)
      .end(done);
  });
});

describe("POST auth/signin", () => {
  it("should signin an existing user and respond with 200 and the user", (done) => {
    agent
      .post("/auth/signin")
      .send({ studentid: "12345", password: "password" })
      .expect(200)
      .expect((res) => {
        expect(res.body.studentid).toBe("12345");
        expect(res.body.name).toBe("Chih-Wei");
        expect(res.body.department).toBe("Languages");
        expect(res.body.choices).toEqual(["Google", "Facebook", "Twitter"]);
      })
      .end(done);
  });

  it("should send 'Unauthorized' if user details not valid", (done) => {
    request(app)
      .post("/auth/signin")
      .send({ studentid: "12345", password: "p" })
      .expect((res) => {
        expect(res.text).toContain("Unauthorized");
      })
      .end(done);
  });
});

describe("GET /api/current_user", () => {
  it("should return current user when logged in", (done) => {
    agent
      .get("/api/current_user")
      .expect(200)
      .expect((res) => {
        expect(res.body.name).toBe("Chih-Wei");
      })
      .end(done);
  });

  it("should return unauthorized when user logged out", (done) => {
    request(app)
      .get("/api/current_user")
      .expect(401)
      .end(done);
  });
});

describe("GET /api/signupAuth", () => {
  it("should return signup status", (done) => {
    agent
      .get("/api/signupAuth")
      .expect(200)
      .expect((res) => {
        expect(res.text).toBe("true");
      })
      .end(done);
  });
});

describe("GET /api/companies", () => {
  it("should send companies when logged in", (done) => {
    agent
      .get("/api/companies")
      .expect(200)
      .expect((res) => {
        expect(res.body.companies).toBeTruthy();
      })
      .end(done);
  });

  it("should return unauthorized when user logged out", (done) => {
    request(app)
      .get("/api/companies")
      .expect(401)
      .end(done);
  });
});

describe("PATCH /api/updateStudent", () => {
  it("should update student details", (done) => {
    agent
      .patch("/api/updateStudent")
      .send({ name: "Bob", department: "Philology", choices: ["Uber"] })
      .expect(200)
      .expect((res) => {
        expect(res.body.name).toBe("Bob");
        expect(res.body.department).toBe("Philology");
        expect(res.body.choices).toEqual(["Uber"]);
      })
      .end((err, res) => {
        User.findOne({ _id: users[0]._id })
          .then((user) => {
            expect(user.name).toBe("Bob");
            expect(user.department).toBe("Philology");
            expect(user.choices[0]).toBe("Uber");
            done();
          })
          .catch((err) => done(err));
      });
  });

  it("should return unauthorized when user logged out", (done) => {
    request(app)
      .patch("/api/updateStudent")
      .expect(401)
      .end(done);
  });
});

// ADMIN ROUTES

describe("POST /auth/admin/signup", () => {
  it("should not allow creation of second admin", (done) => {
    request(app)
      .post("/auth/admin/signup")
      .send({ username: "admin2", password: "1521993", adminSecret: process.env.ADMIN_SECRET })
      .expect(400)
      .end(done);
  });

  it("should return 404 if admin secret is incorrect", (done) => {
    request(app)
      .post("/auth/admin/signup")
      .send({ username: "admin2", password: "1521993", adminSecret: "3" })
      .expect(404)
      .end(done);
  });
});

describe("POST /auth/admin/signin", () => {
  it("should sign in admin", (done) => {
    admin
      .post("/auth/admin/signin")
      .send({ username: "admin", password: "1521993" })
      .expect(200)
      .expect((res) => {
        expect(res.body.username).toBe("admin");
      })
      .end(done);
  });
});

describe("GET /api/current_admin", () => {
  it("should get current admin", (done) => {
    admin
      .get("/api/current_admin")
      .expect(200)
      .expect((res) => {
        expect(res.body.username).toBe("admin");
      })
      .end(done);
  });

  it("shouldn't let unauthorised user get admin details", (done) => {
    request(app)
      .get("/api/current_admin")
      .expect(401)
      .end(done);
  });
});

describe("DELETE /api/all", () => {
  it("should return 401 if user is not admin", (done) => {
    request(app)
      .delete("/api/all")
      .expect(401)
      .end(done);

    agent
      .delete("/api/all")
      .expect(401)
      .end(done);
  });

  it("should return 200 and delete all companies and students user is admin", async (done) => {

    const adminDoc = await Admin.findOne({ username: "admin" });
    const companyChoices = adminDoc.companyChoices;
    expect(companyChoices.length).toBeGreaterThan(0);

    const users = await User.find({});
    expect(users.length).toBeGreaterThan(0);

    admin
      .delete("/api/all")
      .send()
      .expect(200)
      .end(async (err, res) => {
        if (err) {
          done(err);
        }

        try {
          const users = await User.find({});
          expect(users.length).toEqual(0);
  
          const adminDoc = await Admin.findOne({ username: "admin" });
          const companyChoices = adminDoc.companyChoices;
          expect(companyChoices.length).toEqual(0);
          done()
        } catch (error) {
          done(error);
        }
      });
  });
})

describe("PATCH /api/updateAdmin", () => {
  it("should update companies", (done) => {
    admin
      .patch("/api/updateAdmin")
      .send({
        companyChoices: [
          { name: "Google", numberAccepted: 3, choices: [] },
          { name: "Apple", numberAccepted: 3, choices: [] },
          { name: "Deliveroo", numberAccepted: 3, choices: [] }
        ]
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.companyChoices.Deliveroo).toBeTruthy();
      })
      .end((err, res) => {
        Admin.findOne({})
          .then((admin) => {
            expect(admin.companyChoices[2].name).toBe("Deliveroo");
            done();
          })
          .catch((err) => done(err));
      });
  });

  it("should update allowStudentSignup and allowStudentChoices", (done) => {
    admin
      .patch("/api/updateAdmin")
      .send({
        allowStudentSignup: false,
        allowStudentChoices: false
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.allowStudentSignup).toBe(false);
        expect(res.body.allowStudentChoices).toBe(false);
      })
      .end((err, res) => {
        Admin.findOne({})
          .then((admin) => {
            expect(admin.allowStudentSignup).toBe(false);
            expect(admin.allowStudentChoices).toBe(false);
            done();
          })
          .catch((err) => done(err));
      });
  });

  it("shouldn't let unauthorised user get admin details", (done) => {
    request(app)
      .patch("/api/updateAdmin")
      .expect(401)
      .end(done);
  });
});

describe("GET /api/numberOfAdmins", () => {
  it("should send the number of admins", (done) => {
    admin
      .get("/api/numberOfAdmins")
      .expect(200)
      .expect((res) => {
        expect(res.text).toBe("1");
      })
      .end(done);
  });
});

describe("GET /api/studentChoices", () => {
  it("should send student choices", (done) => {
    admin
      .get("/api/studentChoices")
      .expect(200)
      .expect((res) => {
        expect(res.body.students).toBeTruthy();
      })
      .end(done);
  });

  it("should not let unauthorised users access it", (done) => {
    agent
      .get("/api/studentChoices")
      .expect(401)
      .end(done);
  });
});

describe("GET /api/logout", () => {
  it("should log admin out", (done) => {
    admin
      .get("/auth/logout")
      .expect(302)
      .end(done);
  });

  it("should log user out", (done) => {
    agent
      .get("/auth/logout")
      .expect(302)
      .end(done);
  });
});

server.close();
