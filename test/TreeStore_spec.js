var rewire        = require("rewire"),
    path          = require("path"),
    fs            = require("fs-extra"),
    temp          = require("temp"),
    Immutable     = require("immutable"),
    TreeActions   = require("../src/actions/TreeActions"),
    TreeStore     = rewire("../src/stores/TreeStore");

// Automatically track and cleanup files at exit
temp.track();

describe("TreeStore", function () {
  beforeEach(function () {
    this.tempDir = temp.mkdirSync("file-tree-directory");
    // A file in the root folder
    fs.outputFileSync(this.tempDir + "/at_root", "");
    // Some files in a folder named 'z'
    fs.outputFileSync(this.tempDir + "/z/file_1", "");
    fs.outputFileSync(this.tempDir + "/z/file_2", "");
    fs.outputFileSync(this.tempDir + "/z/file_3", "");
    // A file in a deep folder
    fs.outputFileSync(this.tempDir + "/d/e/e/p/deep_1", "");

    TreeStore.__set__("_contentDir", this.tempDir);
  });

  afterEach(function () {
    TreeStore.reset();
  });

  describe("init", function () {
    it("emits a change event", function (done) {
      TreeStore.addChangeListener(done);
      TreeActions.init();
    });

    it("builds the root node", function () {
      TreeActions.init();
      var rootNode = TreeStore.getNode();
      expect(rootNode.get("name")).to.eql(path.basename(this.tempDir));
      expect(rootNode.get("path")).to.eql(".");
      expect(rootNode.get("children")).to.be.an.instanceof(Immutable.List);
    });

    it("expands the given path", function () {
      TreeActions.init(".");
      expect(TreeStore.getNode().get("expanded")).to.be.true;
    });
  });

  describe("getting a node", function () {
    context("before the tree is initialised", function () {
      it("returns undefined", function () {
        expect(TreeStore.getNode()).to.be.undefined;
        expect(TreeStore.getNode("at_root")).to.be.undefined;
        expect(TreeStore.getNode("z/file_1")).to.be.undefined;
        expect(TreeStore.getNode("path/not/found")).to.be.undefined;
      });
    });

    context("after the tree is initialised", function () {
      beforeEach(function () {
        TreeActions.init();
      });

      it("finds only expanded node", function () {
        expect(TreeStore.getNode()).to.be.an.instanceof(Immutable.Map);
        expect(TreeStore.getNode("at_root")).to.be.undefined;
        expect(TreeStore.getNode("z/file_1")).to.be.undefined;
        expect(TreeStore.getNode("path/not/found")).to.be.undefined;
        TreeActions.expand("z");
        expect(TreeStore.getNode("z/file_1")).to.not.be.undefined;
        expect(TreeStore.getNode("d/e/e/p")).to.be.undefined;
        TreeActions.expand("d/e/e/p");
        expect(TreeStore.getNode("d/e/e/p")).to.not.be.undefined;
        expect(TreeStore.getNode("d/e/e/p/deep_1")).to.not.be.undefined;
      });
    });
  });

  describe("expanding a node", function () {
    beforeEach(function () {
      TreeActions.init();
    });

    it("marks the node as expanded", function () {
      expect(TreeStore.getNode().get("expanded")).to.be.false;
      TreeActions.expand(".");
      expect(TreeStore.getNode().get("expanded")).to.be.true;
    });

    it("expands its parents", function () {
      TreeActions.expand("d/e/e/p");
      expect(TreeStore.getNode(".").get("expanded")).to.be.true;
      expect(TreeStore.getNode("d").get("expanded")).to.be.true;
      expect(TreeStore.getNode("d/e").get("expanded")).to.be.true;
      expect(TreeStore.getNode("d/e/e").get("expanded")).to.be.true;
      expect(TreeStore.getNode("d/e/e/p").get("expanded")).to.be.true;
    });

    it("loads the node's children", function () {
      TreeActions.expand(".");
      expect(TreeStore.getNode().get("children").size).to.eql(3);
    });

    it("does not load children recursively", function () {
      TreeActions.expand(".");
      expect(TreeStore.getNode("d").get("children").size).to.eql(0);
    });

    it("ignores .git, .DS_Store and Thumbs.db nodes", function () {
      // Add some nodes to ignore
      fs.outputFileSync(this.tempDir + "/.DS_Store", "");
      fs.outputFileSync(this.tempDir + "/Thumbs.db", "");
      fs.ensureDirSync(this.tempDir + "/.git");

      TreeActions.expand(".");

      expect(TreeStore.getNode().get("children").size).to.eql(3)
    });

    it("sorts children folder first", function () {
      TreeActions.expand(".");

      var children = TreeStore.getNode().get("children");
      expect(children.getIn([0, "name"])).to.eql("d");
      expect(children.getIn([1, "name"])).to.eql("z");
      expect(children.getIn([2, "name"])).to.eql("at_root");
    });
  });

  describe("collapsing a node", function () {
    beforeEach(function () {
      TreeActions.init(".");
    });

    it("marks the node as collapsed", function () {
      expect(TreeStore.getNode().get("expanded")).to.be.true;
      TreeActions.collapse(".");
      expect(TreeStore.getNode().get("expanded")).to.be.false;
    });

    it("does not collapse its children", function () {
      TreeActions.expand("d");

      expect(TreeStore.getNode().get("expanded")).to.be.true;
      expect(TreeStore.getNode().getIn(["children", 0, "expanded"])).to.be.true;
      TreeActions.collapse(".");
      expect(TreeStore.getNode().getIn(["children", 0, "expanded"])).to.be.true;
    });
  });

  describe("toggling a node", function () {
    beforeEach(function () {
      TreeActions.init();
    });

    it("toggles the expanded state of a node", function () {
      TreeActions.toggle("z")
      expect(TreeStore.getNode("z").get("expanded")).to.be.true;
      TreeActions.toggle("z")
      expect(TreeStore.getNode("z").get("expanded")).to.be.false;
      TreeActions.toggle("z")
      expect(TreeStore.getNode("z").get("expanded")).to.be.true;
    });
  });

  describe("selecting a node", function () {
    beforeEach(function () {
      TreeActions.init("z");
    });

    it("marks it as selected", function () {
      TreeActions.select("z/file_2");
      expect(TreeStore.getNode("z/file_2").get("selected")).to.be.true;
    });

    it("unmarks the previous selected node", function () {
      TreeActions.select("z/file_2");
      expect(TreeStore.getNode("z/file_2").get("selected")).to.be.true;
      TreeActions.select("d");
      expect(TreeStore.getNode("z/file_2").get("selected")).to.be.false;
      expect(TreeStore.getNode("d").get("selected")).to.be.true;
    });
  });

  describe("watching for changes", function () {
    beforeEach(function () {
      TreeActions.init();
    });

    context("when a file is added to an expanded node", function () {
      beforeEach(function () {
        TreeActions.expand(".");
      });

      it("adds the new node to the tree", function (done) {
        TreeStore.addChangeListener(function () {
          expect(TreeStore.getNode().get("children").size).to.eql(4);
          done();
        });
        fs.outputFileSync(this.tempDir + "/new_file");
      });
    });

    context("when a file is deleted from an expanded node", function () {
      beforeEach(function () {
        TreeActions.expand("z");
      });

      it("removes the deleted node from the tree", function (done) {
        TreeStore.addChangeListener(function () {
          expect(TreeStore.getNode().get("children").size).to.eql(2);
          done();
        });
        fs.removeSync(this.tempDir + "/z");
      });

      it("re-indexes the node's children", function (done) {
        TreeStore.addChangeListener(function () {
          expect(TreeStore.getNode("z").get("children").size).to.eql(3);
          expect(TreeStore.getNode("z/file_2").get("name")).to.eql("file_2");
          done();
        });
        fs.removeSync(this.tempDir + "/d");
      });

      it("tidies up when nodes are deleted", function (done) {
        TreeActions.expand("d/e/e/p");
        TreeActions.select("d/e/e/p/deep_1");

        TreeStore.addChangeListener(function () {
          var expandedPaths = TreeStore.__get__("_expandedPaths");
          expect(expandedPaths).to.not.include("d");
          expect(expandedPaths).to.not.include("d/e");
          expect(expandedPaths).to.not.include("d/e/e");
          expect(expandedPaths).to.not.include("d/e/e/p");
          var watchers = TreeStore.__get__("_watchers");
          expect(watchers).to.not.have.keys("d", "d/e", "d/e/e", "d/e/e/p");
          var nodeMap = TreeStore.__get__("_nodeMap");
          expect(nodeMap).to.not.have.keys("d", "d/e", "d/e/e", "d/e/e/p");
          expect(TreeStore.__get__("_selectedNodePath")).to.be.empty;
          done();
        });
        fs.removeSync(this.tempDir + "/d");
      });

      context("when an expanded node is deleted", function () {
        it("cleans up after itself", function () {

        });
      });
    });

    describe("collapsing a previously expanded node", function () {
      beforeEach(function () {
        TreeActions.expand(".");
      });

      it("stops watching for changes on the node", function (done) {
        TreeActions.collapse(".");
        fs.outputFileSync(this.tempDir + "/new_file");
        setTimeout(function () {
          expect(TreeStore.getNode().get("children").size).to.eql(3);
          done();
        }, 500);
      });

      context("with expanded children", function () {
        beforeEach(function () {
          TreeActions.expand("z");
          TreeActions.expand("d/e/e/p");
          TreeActions.collapse(".");
        });

        it("stops watching for changes on the expanded children", function (done) {
          fs.outputFileSync(this.tempDir + "/z/new_file");
          fs.outputFileSync(this.tempDir + "/d/e/e/p/new_file");
          setTimeout(function () {
            expect(TreeStore.getNode("z").get("children").size).to.eql(3);
            expect(TreeStore.getNode("d/e/e/p").get("children").size).to.eql(1);
            done();
          }, 500);
        });

        context("when re-expanding the node", function () {
          beforeEach(function () {
            TreeActions.expand(".");
          });

          it("restarts watching for changes on expanded children", function (done) {
            TreeStore.addChangeListener(function () {
              expect(TreeStore.getNode("z").get("children").size).to.eql(4);
              expect(TreeStore.getNode("d/e/e/p").get("children").size).to.eql(2);
              done();
            });
            fs.outputFileSync(this.tempDir + "/z/new_file");
            fs.outputFileSync(this.tempDir + "/d/e/e/p/new_file");
          });
        });
      });
    });

    context("when collapsed", function () {
      it("does not watch for changes", function () {
        fs.outputFileSync(this.tempDir + "/new_file");
        expect(TreeStore.getNode().get("children").size).to.eql(0);
      });
    });
  });
});
