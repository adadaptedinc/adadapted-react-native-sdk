/**
 * Unit tests for {@link AdPopup}
 * @module
 */
import * as React from "react";
import { mount, ReactWrapper } from "enzyme";
import { ExtractReactPropsType } from "../types";
import { AdPopup } from "./AdPopup";
import { adadaptedApiTypes } from "../api/adadaptedApiTypes";

type AdPopupWrapper = ReactWrapper<ExtractReactPropsType<typeof AdPopup>>;

describe("AdPopup", () => {
    test("Sample unit test", () => {
        const wrapper: AdPopupWrapper = mount(
            <AdPopup
                ad={{
                    ad_id: "1816",
                    impression_id: "100838::C4D792785EA1EC91",
                    refresh_time: 30,
                    hide_after_interaction: false,
                    type: "html",
                    creative_url:
                        "https://testurl.com/a/NTLKNZKYMMI2NTM1;100838;1815?session_id=TEST_SESSION_ID&amp;udid=00000000-0000-0000-0000-000000000000",
                    tracking_html: "<html></html>",
                    action_type: adadaptedApiTypes.models.AdActionType.CONTENT,
                    action_path: "",
                    payload: {
                        detailed_list_items: [
                            {
                                product_barcode: "0",
                                product_brand: "Brand",
                                product_category: "",
                                product_discount: "",
                                product_image: "",
                                product_sku: "",
                                product_title: "Sample Product"
                            }
                        ]
                    },
                    popup: {
                        title_text: "",
                        background_color: "",
                        text_color: "",
                        alt_close_btn: "",
                        type: "",
                        hide_banner: false,
                        hide_close_btn: false,
                        hide_browser_nav: false
                    }
                }}
                onAddToListItemClicked={() => {
                    // Mock this method.
                }}
            />
        );

        wrapper.detach();
    });
});
