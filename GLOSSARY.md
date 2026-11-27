# Node

A personal library where each User saves web links (Bookmarks) and free-form writing (Notes), organized with Collections and Tags. Each User's library is private to them.

## Language

### People

**User**:
A person who has signed up and owns a private library of Bookmarks and Notes.
_Avoid_: Account, member, customer

### Items

**Item**:
Either a Bookmark or a Note; the umbrella term when something applies to both.
_Avoid_: Entry, record, card

**Bookmark**:
A saved web link: always exactly one URL, plus an optional title and an optional Description. Anything worth remembering without a URL is a Note, not a Bookmark.
_Avoid_: Link, favorite, saved page

**Note**:
A piece of free-form writing with a body and an optional title, not tied to a single URL.
_Avoid_: Memo, document, page

**Description**:
A short plain-text remark on a Bookmark, such as why it was saved.
_Avoid_: Note, comment, summary

**Pin**:
A mark that keeps an Item above the others in its list.
_Avoid_: Favorite, star, bookmark

### Organization

**Collection**:
A named group of Items about one topic; it can hold Bookmarks and Notes together, and an Item lives in at most one Collection or in none. Collections do not nest.
_Avoid_: Folder, board, category

**Tag**:
A short label describing what an Item is about; Bookmarks and Notes share the same Tags, and an Item can carry many.
_Avoid_: Label, keyword, category
