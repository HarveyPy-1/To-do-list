const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash")
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

// Create listSchema to form database relationships
const listSchema = {
	name: {
		type: String,
		required: true,
	},
	items: [itemsSchema],
};

const List = mongoose.model("List", listSchema);

app.get("/", (req, res) => {
	const day = date.getDate();

	res.render("list", { listTitle: "Home", newListItems: allItems });
});

app.post("/", (req, res) => {
	const itemName = req.body.newItem;
	const listName = req.body.list;

	const newItem = new Item({
		name: itemName,
	});

	// "Today" was supposed to be passed as the H1, but I stuck with the date instead"
	if (listName === "Home") {
		newItem.save();
		allItems = [];
		loadItems();
		res.redirect("/");
	} else {
		// 'foundItems' can be any name you want
		List.findOne({ name: listName }).then((foundItems) => {
			foundItems.items.push(newItem);
			foundItems.save();
			allItems = [];
			loadItems();
			res.redirect(`/${listName}`);
		});
	}
});

// Dynamic URL
app.get("/:customListName", (req, res) => {
	const customListName = _.capitalize(req.params.customListName);

	List.findOne({ name: customListName })
		.then((foundItems) => {
			if (!foundItems) {
				// Create a new List
				const list = new List({
					name: customListName,
					items: defaultItems,
				});

				list.save();
				res.redirect(`/${customListName}`);
			} else {
				// Show the list
				res.render("list", {
					listTitle: customListName,
					newListItems: foundItems.items,
				});
			}
		})
		.catch((err) => {
			console.error(err);
		});
});

app.post("/delete", (req, res) => {
	const checkedItemId = req.body.checkbox;
	const listName = req.body.listName;

	if (listName === "Home") {
		Item.findByIdAndDelete(checkedItemId)
			.then(() => {
				console.log("Item deleted successfully...");
			})
			.catch((err) => {
				console.error(err);
			});

		allItems = [];
		loadItems();

		res.redirect("/");
	} else {
		// Find a list (collection) with the name 'listName', $pull(delete) from an array called 'items', a file with the '_id' of 'checkedItemId. Then, callback function
		List.findOneAndUpdate(
			{ name: listName },
			{ $pull: { items: { _id: checkedItemId } } }
		)
			.then(() => {
				console.log("Item from list deleted successfully...");
			})
			.catch((err) => {
				console.error(err);
			});

    allItems = []
    loadItems();

    res.redirect(`/${listName}`)
	}
});

app.get("/about", (req, res) => {
	res.render("about");
});

app.listen(3000, () => {
	console.log("Server started on port 3000...");
});
