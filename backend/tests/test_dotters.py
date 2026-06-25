from app import dotters


def test_remove_dots_is_length_preserving_and_idempotent():
    dotted = "بنت نجاح"
    rasm = dotters.remove_dots(dotted)
    # rule-based char mapping preserves length
    assert len(rasm) == len(dotted)
    # removing dots from already-dotless text changes nothing
    assert dotters.remove_dots(rasm) == rasm
    # a dotted input actually loses some dots
    assert rasm != dotted


def test_catalog_lists_all_five_methods_with_flags():
    catalog = dotters.catalog()
    ids = [m["id"] for m in catalog]
    assert ids == ["ngram", "lstm", "transformer", "canine", "llm"]
    llm = next(m for m in catalog if m["id"] == "llm")
    assert llm["requiresKey"] is True
    assert all("available" in m for m in catalog)
