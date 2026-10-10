# La cometa de los domingos — local illustrated demo

Four generated PNG illustrations without embedded text, one per existing story page. These depict generic characters in the fictional demo, not real family members. Created with the built-in image generation tool on 2026-10-10. The existing approved Spanish draft and four ElevenLabs narration files are preserved.

Import into the existing local pilot fixture:

```sh
node --env-file=.env --conditions=react-server --import=tsx scripts/pilot/import-comet-illustrations.mts fixtures/comet-comic/page-1.png fixtures/comet-comic/page-2.png fixtures/comet-comic/page-3.png fixtures/comet-comic/page-4.png
```

The importer requires localhost database/storage endpoints and the existing ready four-page creation `cmv266me20004nqsc8n73eca9`. It saves the initial creation record in ignored `backups/`, uploads the illustrations to private storage, and replaces only that fixture's image references. It can be rerun with the same assets without duplicating references. It does not bootstrap a new family or story.

Open http://localhost:3000/story-mode/cmv21ou7o0000h9scmysjgezu/cmv266me20004nqsc8n73eca9 from the adult family session. Select Open story, then Listen. Narration advances to the next page by default and stops at the last page. Story options → Automatic pages disables advancement. Text remains selectable and separate from the illustration; image and reading expansion use the existing reader dialogs.

This fixture imports manually generated art; automatic comic image generation through the application's configured provider is still a separate task.

Validated locally: typecheck, focused ESLint, five story-mode tests, and Next.js compilation diagnostics passed. Browser playback advanced through all four pages and stopped at the end; disabling Automatic pages kept page 1 selected after its narration finished. A database comparison confirmed the original draft and narration references were unchanged.

The Turn.js reader also supports grabbing illustrations and blank parts of a sheet, not just corners. The fold tracks the drag through the existing engine; controls and story text are excluded to preserve interaction and text selection. Forward and backward drags from the sheet interior were verified in the local desktop browser.
