const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const date = require(__dirname + "/date.js");

const app = express();

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// const items = ["Buy Food", "Cook Food", "Eat Food"];
// const workItems = [];

// Connect to MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/todolistDB", {
	useNewUrlParser: true,
});

// Define Schema template
const itemsSchema = {
	name: {
		type: String,
		required: true,
	},
};

//Create Model (Collection) based on defined Schema
const Item = mongoose.model("Item", itemsSchema);

// Create default items to be added to database
const item1 = new Item({
	name: "Welcome to your Todo List",
});

const item2 = new Item({
	name: "Click on the + button to add a new item",
});

const item3 = new Item({
	name: "<-- Click on this to delete an item",
});

const defaultItems = [item1, item2, item3];

// Add items to database
async function insertDefaultItems() {
	try {
		await Item.insertMany(defaultItems);
		console.log("Successfully added items to the database...");
	} catch (err) {
		console.error(err);
	}
}

// Find items and add to an array, add default items if empty
let allItems = [];

async function loadItems() {
	allItems = await Item.find();

	if (allItems.length === 0) {

		try {
			await insertDefaultItems();
		} catch (err) {
			console.error(err);
		}
	}

	console.log("Items loaded successfully...");
}

loadItems();

app.get("/", (req, res) => {
	const day = date.getDate();

	res.render("list", { listTitle: day, newListItems: allItems });
});

app.post("/", (req, res) => {
	const itemName = req.body.newItem;

	const newItem = new Item({
		name: itemName,
	});

	newItem.save();
  allItems = []
	loadItems();

	res.redirect("/");
});

app.post("/delete", (req, res) => {
  const checkedItemId = req.body.checkbox

  Item.findByIdAndDelete(checkedItemId)
    .then(() => {
      console.log("Item deleted successfully...")
    })
    .catch((err) => {
      console.error(err)
    })

  allItems = []
  loadItems();

  res.redirect("/")
})

app.get("/about", (req, res) => {
	res.render("about");
});

app.listen(3000, () => {
	console.log("Server started on port 3000...");
});
