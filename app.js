const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");
const date = require(__dirname + "/date.js");

const app = express();

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// Connect to MongoDB
const uri =
	"mongodb+srv://admin-harvey:sfoJX2FUCiJl57B5@cluster0.fll2ghs.mongodb.net/todolistDB";

mongoose.connect(uri, {
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

// Create listSchema to form database relationships
const listSchema = {
	name: {
		type: String,
		required: true,
	},
	items: [itemsSchema],
};

const List = mongoose.model("List", listSchema);

let errorMessage;

app.get("/", async (req, res) => {
	const day = date.getDate();
	let errorMessage = req.query.errorMessage || "";

	// Find items and add to an array, add default items if empty
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
  
	await loadItems();

  res.render("list", { listTitle: "Home", newListItems: allItems, errorMessage: errorMessage });
});

app.post("/", (req, res) => {
	const itemName = req.body.newItem;
	const listName = req.body.list;

	const newItem = new Item({
		name: itemName,
	});

	// "Today" was supposed to be passed as the H1, but I stuck with the date instead"
	try {
		if (listName === "Home") {
			if (newItem.name) {
				newItem.save();
				res.redirect("/");
			} else {
				console.log("Please add a task...");
				res.redirect("/?errorMessage=New%20item%20cannot%20be%20left%20empty!");
			}
		} else {
			if (newItem.name) {
				// 'foundItems' can be any name you want
				List.findOne({ name: listName }).then((foundItems) => {
					foundItems.items.push(newItem);
					foundItems.save();
					res.redirect(`/${listName}`);
				});
			} else {
				console.log("Please add a task too...");
        res.redirect(
					`/${listName}?errorMessage=New%20item%20cannot%20be%20left%20empty!`
				);
			}
		}
	} catch (err) {
		if (err.name === "ValidatorError") {
			res.status(400).send("Validation Error: " + err.message);
		} else {
			console.error(err);
			res.status(500).send("Server Error");
		}
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
        let errorMessage = req.query.errorMessage || ""
				res.render("list", {
					listTitle: customListName,
					newListItems: foundItems.items, errorMessage
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

		res.redirect(`/${listName}`);
	}
});

app.get("/about", (req, res) => {
	res.render("about");
});

app.listen(3000, () => {
	console.log("Server started on port 3000...");
});
