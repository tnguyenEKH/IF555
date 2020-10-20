jQuery(function ($) {

    // Dropdown menu
    $(".sidebar-dropdown > a").click(function () {
        $(".sidebar-submenu").slideUp(200);
        if ($(this).parent().hasClass("active")) {
            $(".sidebar-dropdown").removeClass("active");
            $(this).parent().removeClass("active");
        } else {
            $(".sidebar-dropdown").removeClass("active");
            $(this).next(".sidebar-submenu").slideDown(200);
            $(this).parent().addClass("active");
        }

    });
	
    // 2ndDropdown menu
    $(".sidebar-2nddropdown > a").click(function () {
        $(".sidebar-2ndsubmenu").slideUp(200);
        if ($(this).parent().hasClass("active")) {
            $(".sidebar-2nddropdown").removeClass("active");
            $(this).parent().removeClass("active");
        } else {
            $(".sidebar-2nddropdown").removeClass("active");
            $(this).next(".sidebar-2ndsubmenu").slideDown(200);
            $(this).parent().addClass("active");
        }

    });
	
	// 3rdDropdown menu
    $(".sidebar-3rddropdown > a").click(function () {
        $(".sidebar-3rdsubmenu").slideUp(200);
        if ($(this).parent().hasClass("active")) {
            $(".sidebar-3rdddropdown").removeClass("active");
            $(this).parent().removeClass("active");
        } else {
            $(".sidebar-3rddropdown").removeClass("active");
            $(this).next(".sidebar-3rdsubmenu").slideDown(200);
            $(this).parent().addClass("active");
        }

    });
	
	// 4thDropdown menu
    $(".sidebar-4thddropdown > a").click(function () {
        $(".sidebar-4thsubmenu").slideUp(200);
        if ($(this).parent().hasClass("active")) {
            $(".sidebar-4thddropdown").removeClass("active");
            $(this).parent().removeClass("active");
        } else {
            $(".sidebar-4thdropdown").removeClass("active");
            $(this).next(".sidebar-4thsubmenu").slideDown(200);
            $(this).parent().addClass("active");
        }

    });

});

