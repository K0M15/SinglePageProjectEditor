# SinglePageProjectEditor
## Introduction
This is a single page project editor.
For me, it should replace the Android/Google Notice app, which limits myself in writing up things when planing something.

This could be a project, an event, or just todo-list

Target is, to have it written in HTML, Vanilla CSS and Vanilla JS.

Functionaly, this consists of templates which can be added to a site.
Each Template should be able to provide an Edit-Functionality

Since the whole Website should be saved, no problems with versions should occur.

## Project Status
This project is in the early stages of development.

## Currently Working
- Text with Basic Markdown https://www.markdownguide.org/cheat-sheet/
- Pictures
- Saving & Loading using localStorage

## Still to create
- Delete Button to Pictures
- Move the panels
- Links in Text

### Templates
- 5Why
- Fishbone
- SWOT-Analysis
- Actions
    - Additional Columns
    - Sortable
    - Moveable Columns
    - DateSelector
- Dates
- Tables
- A calculator
- A Help Overlay

### Functionality
 - Save as new page (to keep contents)
 - Presentation-Mode
 - CO-Working and backend
 - Create Plugin System for Elements. Define class better and put some description of the button, the new Element in there
 - Maybe create hooks for site load or something

## BUGS
 - While reconstructing the site and adding new elements, id could occure double. This should be fixed in the future when switching to a total oop model, since the app should recive an id-counter (or better)